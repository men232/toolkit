import { isSuccess } from '@andrew_l/toolkit';
import { EventEmitter } from 'node:events';
import { describe, expect, it, vi } from 'vitest';
import testAppDef from './__fixtures__/test-app.js';
import {
  createAppInstance,
  defineApp,
  runApp,
  setupApp,
  shutdownApp,
  stopApp,
} from './app.js';
import {
  type ParentPortLike,
  createAppThread,
  createAppThreadInstance,
} from './appThread.js';
import {
  type ManagedThread,
  createThreadMessage,
  isThreadMessage,
} from './managedThread.ts';

interface MockPort extends ParentPortLike {
  sent: ManagedThread.ThreadMessage[];
  emit(event: 'message', msg: unknown): void;
}

function makeMockPort(): MockPort {
  const port = new EventEmitter() as any as MockPort;
  port.sent = [];
  port.postMessage = function (msg) {
    if (isThreadMessage(msg)) {
      this.sent.push(msg);
    }
  };

  return port;
}

describe('createAppThreadInstance', () => {
  it('sends ready signal with pid on init', async () => {
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false }),
      parentPort: port,
      threadId: 1,
    });
    expect(port.sent.find(v => v.type === 'ready')).toEqual(
      createThreadMessage('ready', {
        pid: process.pid,
      }),
    );
  });

  it('appends threadId to definition name', async () => {
    const port = makeMockPort();
    const instance = createAppThreadInstance({
      definition: defineApp({ name: 'my-app', logger: false }),
      parentPort: port,
      threadId: 5,
    });
    expect(instance.definition.name).toBe('my-app.5');
  });

  it('returns the app instance', async () => {
    const port = makeMockPort();
    const instance = createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false }),
      parentPort: port,
      threadId: 1,
    });
    expect(instance).toBeDefined();
    expect(instance.definition).toBeDefined();
  });

  it('does not mutate the original definition', async () => {
    const port = makeMockPort();
    const def = defineApp({ name: 'original', logger: false });
    createAppThreadInstance({
      definition: def,
      parentPort: port,
      threadId: 2,
    });
    expect(def.name).toBe('original');
  });

  it('handles setup message: calls setup and sends setup_done with ExecSuccess', async () => {
    const setup = vi.fn().mockReturnValue({ value: 42 });
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', setup, logger: false }),
      parentPort: port,
      threadId: 1,
    });
    port.sent.length = 0;

    port.emit(
      'message',
      createThreadMessage('setup', { props: { foo: 'bar' } }),
    );
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'setup_done')?.result).toEqual({
        code: 'setup_app',
        success: true,
      }),
    );
    expect(setup).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('sends setup_done with ExecSkip when setup throws', async () => {
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({
        name: 'test',
        logger: false,
        setup: () => {
          throw new Error('boom');
        },
      }),
      parentPort: port,
      threadId: 1,
    });
    port.sent.length = 0;

    port.emit('message', createThreadMessage('setup', { props: {} }));
    await vi.waitFor(() => {
      expect(port.sent.find(v => v.type === 'setup_done')?.result).toEqual({
        skip: true,
        code: 'setup_app',
        error: new Error('boom'),
        reason: 'setup function throw error',
      });
    });
  });

  it('handles start message: calls entry and sends start_done', async () => {
    const entry = vi.fn();
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, entry }),
      parentPort: port,
      threadId: 1,
    });

    port.emit('message', createThreadMessage('setup', { props: {} }));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'setup_done')?.result).toEqual({
        code: 'setup_app',
        success: true,
      }),
    );

    port.emit('message', createThreadMessage('start', {}));

    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'start_done')?.result).toEqual({
        success: true,
        code: 'execute_app',
      }),
    );

    expect(entry).toHaveBeenCalledOnce();
  });

  it('handles stop message: calls stop and sends stop_done', async () => {
    const stop = vi.fn();
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, stop }),
      parentPort: port as any,
      threadId: 1,
    });

    port.emit('message', createThreadMessage('setup', { props: {} }));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'setup_done')?.result).toEqual({
        code: 'setup_app',
        success: true,
      }),
    );

    port.emit('message', createThreadMessage('start', {}));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'start_done')?.result).toEqual({
        code: 'execute_app',
        success: true,
      }),
    );

    port.emit('message', createThreadMessage('stop', {}));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'stop_done')?.result).toEqual({
        code: 'stop_app',
        success: true,
      }),
    );

    expect(stop).toHaveBeenCalledOnce();
  });

  it('handles shutdown message: calls shutdown and sends shutdown_done', async () => {
    const shutdown = vi.fn();
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, shutdown }),
      parentPort: port as any,
      threadId: 1,
    });

    port.emit('message', createThreadMessage('setup', { props: {} }));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'setup_done')).toBeTruthy(),
    );

    port.emit('message', createThreadMessage('shutdown', {}));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'shutdown_done')?.result).toEqual({
        success: true,
        code: 'shutdown_app',
      }),
    );
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it('handles ping: sends pong', async () => {
    const port = makeMockPort();
    createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false }),
      parentPort: port as any,
      threadId: 1,
    });

    port.emit('message', createThreadMessage('ping', {}));
    await vi.waitFor(() =>
      expect(port.sent.find(v => v.type === 'pong')).toBeTruthy(),
    );
  });
});

describe('createAppThread', () => {
  it('adds threads prop', () => {
    const threadsProp = (createAppThread(testAppDef).props as any)?.threads;
    expect(threadsProp?.type).toBe(Number);
  });

  it('throws when definition has no file path', () => {
    expect(() => createAppThread({ name: 'no-path' } as any)).toThrow();
  });

  it('full lifecycle: setup → entry → stop → shutdown', async () => {
    const instance = createAppInstance(createAppThread(testAppDef));
    const setupResult = await setupApp(instance, { threads: 2 });

    expect(isSuccess(setupResult)).toBe(true);
    expect((instance.setupState as any).managedThreads).toHaveLength(2);

    expect(isSuccess(await runApp(instance))).toBe(true);
    expect(isSuccess(await stopApp(instance))).toBe(true);
    expect(isSuccess(await shutdownApp(instance))).toBe(true);
  }, 10_000);

  it('setup validates threads > 0', async () => {
    const instance = createAppInstance(createAppThread(testAppDef));
    const result = await setupApp(instance, { threads: 0 });
    expect(isSuccess(result)).toBe(false);
  });
});
