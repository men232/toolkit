// The one invariant a dev server with HMR stands on: **a reload ends a mount,
// it does not end the app**.
//
// `app.waitUntilExit()` is what a CLI's `main` awaits. The dev server runs the
// app inside its own process and closes itself when that promise settles, so a
// full reload that settled it would return from the await and shut the dev
// server down on the developer's first edit. The split lives in
// `src/createApp.ts` (`teardownMount()` never settles; `exitApp()` is the only
// path that does) and `src/dev/bridge.ts` is what reaches it from outside.
//
// Everything below drives that seam directly with a stand-in hot context, so
// the invariant is checked without a Vite server in the loop.
import { defineComponent, h } from 'vue';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import {
  type DevHotContext,
  connectDevtools,
  disconnectDevtools,
  isDevConnected,
} from '../src/dev/bridge';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const BRIDGE_KEY = '__vue_stdout_dev_bridge__';
const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

function createHot(): DevHotContext & { emit(event: string): void; sent: string[] } {
  const listeners = new Map<string, Array<(payload: unknown) => void>>();
  const sent: string[] = [];

  return {
    sent,
    on(event, cb) {
      const existing = listeners.get(event);
      if (existing) existing.push(cb);
      else listeners.set(event, [cb]);
    },
    send(event) {
      sent.push(event);
    },
    emit(event) {
      for (const cb of listeners.get(event) ?? []) cb(undefined);
    },
  };
}

const Counter = defineComponent({
  name: 'Counter',
  setup() {
    return () => h('stdout-text', {}, 'mounted');
  },
});

/**
 * `waitUntilExit()` rejects on an error exit and never settles on a reload, so
 * every assertion about it has to be "did it settle by now", not "await it".
 */
function settled(promise: Promise<void>): Promise<'settled' | 'pending'> {
  return Promise.race([
    promise.then(
      () => 'settled' as const,
      () => 'settled' as const,
    ),
    flush().then(() => flush()).then(() => 'pending' as const),
  ]);
}

beforeEach(() => {
  delete (globalThis as Record<string, unknown>)[BRIDGE_KEY];
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[BRIDGE_KEY];
});

describe('what a dev session may and may not do to an app', () => {
  it('a full reload releases the mount and the stream, and leaves exit pending', async () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });
    expect(isDevConnected()).toBe(true);

    const stdout = createStdout(30);
    const stdin = createStdin();
    const app = createApp(Counter);
    app.mount({ stdout, stdin, patchConsole: false });
    await flush();

    const exit = app.waitUntilExit();
    hot.emit('vite:beforeFullReload');
    await flush();

    expect(await settled(exit)).toBe('pending');
    // And nothing told the dev server the app had exited -- that event is what
    // would have closed the server.
    expect(hot.sent).toEqual([]);

    // The stream is free again, which is the other half of "released": a
    // second app on the same stdout is what the re-imported entry does next,
    // and it throws if the first mount is still holding it.
    const second = createApp(Counter);
    expect(() => second.mount({ stdout, stdin, patchConsole: false })).not.toThrow();
    second.unmount();
  });

  it('the replaced app cannot be mounted again, and its exit stays pending forever', async () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const stdout = createStdout(30);
    const app = createApp(Counter);
    app.mount({ stdout, stdin: createStdin(), patchConsole: false });
    await flush();

    const exit = app.waitUntilExit();
    hot.emit('vite:beforeFullReload');
    await flush();

    // One mount per app is unchanged by the reload path: the fresh mount comes
    // from the entry Vite re-imports, which calls `createApp()` again.
    expect(() => app.mount({ stdout })).toThrow(/already mounted/);
    expect(await settled(exit)).toBe('pending');
  });

  it('closing the session ends the app and settles exit', async () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const stdout = createStdout(30);
    const app = createApp(Counter);
    app.mount({ stdout, stdin: createStdin(), patchConsole: false });
    await flush();

    const exit = app.waitUntilExit();
    await disconnectDevtools('s1');

    expect(await settled(exit)).toBe('settled');
    expect(isDevConnected()).toBe(false);
  });

  it('a genuine exit tells the dev server, so it can close the server holding the loop open', async () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const app = createApp(Counter);
    app.mount({ stdout: createStdout(30), stdin: createStdin(), patchConsole: false });
    await flush();

    app.unmount();
    await flush();

    expect(hot.sent).toEqual(['vue-stdout:exit']);
  });

  it('a reload after a genuine exit finds nothing to release', async () => {
    const hot = createHot();
    connectDevtools(hot, { sessionId: 's1' });

    const app = createApp(Counter);
    app.mount({ stdout: createStdout(30), stdin: createStdin(), patchConsole: false });
    await flush();
    app.unmount();
    await flush();

    // The mount's teardown unregistered it, so this must be inert rather than
    // a second teardown of an already-freed Yoga tree.
    expect(() => hot.emit('vite:beforeFullReload')).not.toThrow();
  });

  it('wraps the root component only while a dev session is connected', async () => {
    const stdout = createStdout(30);
    const plain = createApp(Counter);
    const plainRoot = plain.mount({ stdout, patchConsole: false });
    await flush();
    expect(plainRoot.$options.name).toBe('Counter');
    plain.unmount();

    connectDevtools(createHot(), { sessionId: 's1' });
    const dev = createApp(Counter);
    const devRoot = dev.mount({ stdout, patchConsole: false });
    await flush();
    // The wrapper is what gives the user's root an `instance.parent`, which is
    // the branch Vue's `__VUE_HMR_RUNTIME__.reload` takes. See `src/dev/DevRoot.ts`.
    expect(devRoot.$options.name).toBe('VueStdoutDevRoot');
    dev.unmount();
  });
});
