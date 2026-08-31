import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectDevtools,
  disconnectDevtools,
  DevSessionConflictError,
  getDevSessionId,
  isDevConnected,
  notifyDevExit,
  registerDevApp,
  unregisterDevApp,
  type DevAppLifecycle,
  type DevHotContext,
} from './bridge';

/**
 * The bridge keeps its state on `globalThis` on purpose -- see the module's own
 * header -- so a test file has to clear it between cases the same way a fresh
 * process would.
 */
const BRIDGE_KEY = '__vue_stdout_dev_bridge__';

function resetBridge(): void {
  delete (globalThis as Record<string, unknown>)[BRIDGE_KEY];
}

/** A stand-in for Vite's `import.meta.hot`, with its listeners exposed. */
function createHot(): DevHotContext & {
  listeners: Map<string, Array<(payload: unknown) => void>>;
  sent: Array<{ event: string; data?: unknown }>;
  emit(event: string): void;
} {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();
  const sent: Array<{ event: string; data?: unknown }> = [];

  return {
    listeners,
    sent,
    on(event, cb) {
      const existing = listeners.get(event);
      if (existing) existing.push(cb);
      else listeners.set(event, [cb]);
    },
    send(event, data) {
      sent.push({ event, data });
    },
    emit(event) {
      for (const cb of listeners.get(event) ?? []) cb(undefined);
    },
  };
}

beforeEach(resetBridge);
afterEach(() => {
  resetBridge();
  vi.restoreAllMocks();
});

describe('dev bridge', () => {
  it('is disconnected, and holds nothing, until a dev server connects', () => {
    expect(isDevConnected()).toBe(false);
    expect(getDevSessionId()).toBeUndefined();
    // The production path: nothing to send to, and no throw for having asked.
    expect(() => notifyDevExit()).not.toThrow();
  });

  it('releases every registered mount on a full reload, without settling exit', () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const closed: string[] = [];
    const replaced: string[] = [];
    const first: DevAppLifecycle = {
      replace: () => replaced.push('first'),
      close: () => void closed.push('first'),
    };
    const second: DevAppLifecycle = {
      replace: () => replaced.push('second'),
      close: () => void closed.push('second'),
    };

    registerDevApp(first);
    registerDevApp(second);
    hot.emit('vite:beforeFullReload');

    expect(replaced).toEqual(['first', 'second']);
    // `close()` is the *other* half of the contract and settles the app's exit
    // promise. A reload must never reach it: doing so would return from the
    // CLI's `waitUntilExit()` and close the dev server on the first edit.
    expect(closed).toEqual([]);
  });

  it('contains a synchronous throw from replace(), and still releases the others', () => {
    // This is the whole reason the handler has a try/catch. Vite's module
    // runner notifies these listeners with
    // `await Promise.allSettled(cbs.map(cb => cb(data)))`: `allSettled` catches
    // rejections, but a listener throwing *synchronously* throws inside `.map`
    // before any promise exists, escapes the notifier and the async HMR
    // handler, and kills the Node process -- taking the dev server and the
    // terminal restoration with it. Every teardown this bridge drives is
    // synchronous, so this is exactly the shape that would be fatal.
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const replaced: string[] = [];
    registerDevApp({
      replace: () => {
        throw new Error('teardown blew up');
      },
      close: () => {},
    });
    registerDevApp({
      replace: () => replaced.push('survivor'),
      close: () => {},
    });

    expect(() => hot.emit('vite:beforeFullReload')).not.toThrow();
    expect(replaced).toEqual(['survivor']);
    expect(errors).toHaveBeenCalled();
  });

  it('re-arms a new hot context on reload, and ignores the retired one', () => {
    const first = createHot();
    connectDevtools(first, { sessionId: 's1' });

    const second = createHot();
    connectDevtools(second, { sessionId: 's1' });

    const replaced: string[] = [];
    registerDevApp({ replace: () => replaced.push('hit'), close: () => {} });

    // Vite retires a hot context with no unsubscribe API, so a queued event
    // from the old one must not reach a later session.
    first.emit('vite:beforeFullReload');
    expect(replaced).toEqual([]);

    second.emit('vite:beforeFullReload');
    expect(replaced).toEqual(['hit']);
  });

  it('does not double-arm when the same hot context connects twice', () => {
    // Vite appends listeners with no de-duplication, so re-registering the
    // same context would fire every handler twice per event.
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });
    connectDevtools(hot, { sessionId: 's1' });

    expect(hot.listeners.get('vite:beforeFullReload')).toHaveLength(1);
  });

  it('rejects a second session while one is live, and reconnects the same one', () => {
    connectDevtools(createHot(), { sessionId: 's1' });

    expect(() => connectDevtools(createHot(), { sessionId: 'other' })).toThrow(
      DevSessionConflictError,
    );
    expect(() => connectDevtools(createHot(), { sessionId: 's1' })).not.toThrow();
    expect(getDevSessionId()).toBe('s1');
  });

  it('identity-guards unregister, so a late teardown cannot wipe a newer mount', () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const stale: DevAppLifecycle = { replace: () => {}, close: () => {} };
    const replaced: string[] = [];
    const live: DevAppLifecycle = {
      replace: () => replaced.push('live'),
      close: () => {},
    };

    registerDevApp(stale);
    registerDevApp(live);
    unregisterDevApp(stale);

    hot.emit('vite:beforeFullReload');
    expect(replaced).toEqual(['live']);
  });

  it('closes every mount on disconnect, and drops the channel before it does', () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    let channelStillLiveWhenClosed: boolean | undefined;
    registerDevApp({
      replace: () => {},
      close: () => {
        // The order is load-bearing: `close()` settles the app's exit, whose
        // `finally` calls `notifyDevExit()`. With the channel still bridged
        // that would send `vue-stdout:exit` back to the plugin and re-enter
        // the very `server.close()` that started this.
        notifyDevExit();
        channelStillLiveWhenClosed = hot.sent.length > 0;
      },
    });

    return disconnectDevtools('s1').then(() => {
      expect(channelStillLiveWhenClosed).toBe(false);
      expect(isDevConnected()).toBe(false);
      expect(getDevSessionId()).toBeUndefined();
    });
  });

  it('ignores a disconnect aimed at a different session', () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });
    const closed: string[] = [];
    registerDevApp({ replace: () => {}, close: () => void closed.push('x') });

    return disconnectDevtools('someone-else').then(() => {
      expect(closed).toEqual([]);
      expect(isDevConnected()).toBe(true);
    });
  });

  it('sends the exit event over the bridged channel, once connected', () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    notifyDevExit();
    expect(hot.sent).toEqual([{ event: 'vue-stdout:exit', data: undefined }]);
  });
});
