import { isSuccess } from '@andrew_l/toolkit';
import { EventEmitter } from 'node:events';
import type { MessagePort } from 'node:worker_threads';
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
import { createAppThread, createAppThreadInstance } from './appThread.js';

function makeMockPort(): MessagePort & { sent: unknown[] } {
  const emitter = new EventEmitter();
  const sent: unknown[] = [];
  return Object.assign(emitter, {
    postMessage(msg: unknown) {
      sent.push(msg);
    },
    sent,
  }) as any;
}

describe('createAppThreadInstance', () => {
  it('sends ready signal on init', async () => {
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false }),
      parentPort: port,
      threadId: 1,
    });
    expect(port.sent).toContain('vrun_app_thread:ready');
  });

  it('appends threadId to definition name', async () => {
    const port = makeMockPort();
    const instance = await createAppThreadInstance({
      definition: defineApp({ name: 'my-app', logger: false }),
      parentPort: port,
      threadId: 5,
    });
    expect(instance.definition.name).toBe('my-app.5');
  });

  it('returns the app instance', async () => {
    const port = makeMockPort();
    const instance = await createAppThreadInstance({
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
    await createAppThreadInstance({
      definition: def,
      parentPort: port,
      threadId: 2,
    });
    expect(def.name).toBe('original');
  });

  it('handles setup message: calls setup and sends setup_done', async () => {
    const setup = vi.fn().mockReturnValue({ value: 42 });
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', setup, logger: false }),
      parentPort: port,
      threadId: 1,
    });
    port.sent.length = 0;

    port.emit('message', {
      type: 'vrun_app_thread:setup',
      props: { foo: 'bar' },
    });
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:setup_done'),
    );
    expect(setup).toHaveBeenCalledWith({ foo: 'bar' });
  });

  it('sends setup_done_error when setup throws', async () => {
    const port = makeMockPort();
    await createAppThreadInstance({
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

    port.emit('message', { type: 'vrun_app_thread:setup', props: {} });
    await vi.waitFor(() => {
      expect(
        port.sent.find(
          m =>
            typeof m === 'object' &&
            (m as any).type === 'vrun_app_thread:setup_done_error',
        ),
      ).toBeDefined();
    });
  });

  it('handles start message: calls entry and sends start_done', async () => {
    const entry = vi.fn();
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, entry }),
      parentPort: port,
      threadId: 1,
    });

    port.emit('message', { type: 'vrun_app_thread:setup', props: {} });
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:setup_done'),
    );
    port.sent.length = 0;

    port.emit('message', 'vrun_app_thread:start');
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:start_done'),
    );
    expect(entry).toHaveBeenCalledOnce();
  });

  it('handles stop message: calls stop and sends stop_done', async () => {
    const stop = vi.fn();
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, stop }),
      parentPort: port as any,
      threadId: 1,
    });

    port.emit('message', { type: 'vrun_app_thread:setup', props: {} });
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:setup_done'),
    );
    port.emit('message', 'vrun_app_thread:start');
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:start_done'),
    );
    port.sent.length = 0;

    port.emit('message', 'vrun_app_thread:stop');
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:stop_done'),
    );
    expect(stop).toHaveBeenCalledOnce();
  });

  it('handles shutdown message: calls shutdown and sends shutdown_done', async () => {
    const shutdown = vi.fn();
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false, shutdown }),
      parentPort: port as any,
      threadId: 1,
    });

    port.emit('message', { type: 'vrun_app_thread:setup', props: {} });
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:setup_done'),
    );
    port.sent.length = 0;

    port.emit('message', 'vrun_app_thread:shutdown');
    await vi.waitFor(() =>
      expect(port.sent).toContain('vrun_app_thread:shutdown_done'),
    );
    expect(shutdown).toHaveBeenCalledOnce();
  });

  it('handles ping: sends pong', async () => {
    const port = makeMockPort();
    await createAppThreadInstance({
      definition: defineApp({ name: 'test', logger: false }),
      parentPort: port as any,
      threadId: 1,
    });
    port.sent.length = 0;

    port.emit('message', 'vrun_app_thread:ping');
    await vi.waitFor(() => expect(port.sent).toContain('vrun_app_thread:pong'));
  });
});

describe('createAppThread', () => {
  it('adds threads prop with default 1', () => {
    const threadsProp = (createAppThread(testAppDef).props as any)?.threads;
    expect(threadsProp?.type).toBe(Number);
    expect(threadsProp?.default()).toBe(1);
  });

  it('throws when definition has no file path', () => {
    expect(() => createAppThread({ name: 'no-path' } as any)).toThrow();
  });

  it('full lifecycle: setup → entry → stop → shutdown', async () => {
    const instance = createAppInstance(createAppThread(testAppDef));
    const setupResult = await setupApp(instance, { threads: 2 });

    expect(isSuccess(setupResult)).toBe(true);
    expect((instance.setupState as any).managedWorkers).toHaveLength(2);

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
