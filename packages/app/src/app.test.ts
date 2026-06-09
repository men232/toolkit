import { isSkip, isSuccess } from '@andrew_l/toolkit';
import { describe, expect, it, vi } from 'vitest';
import {
  createAppInstance,
  defineApp,
  isAppDefinition,
  runApp,
  setupApp,
  shutdownApp,
  startApp,
  stopApp,
} from './app.js';

vi.mock('./logger.js', () => ({
  log: { start: vi.fn(), success: vi.fn() },
}));

describe('defineApp', () => {
  it('returns definition with provided fields', () => {
    const setup = vi.fn();
    const def = defineApp({ name: 'test', description: 'desc', setup });
    expect(def.name).toBe('test');
    expect(def.description).toBe('desc');
    expect(def.setup).toBe(setup);
  });
});

describe('isAppDefinition', () => {
  it('returns true for a defineApp result', () => {
    expect(isAppDefinition(defineApp({ name: 'test' }))).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isAppDefinition({ name: 'test' })).toBe(false);
  });

  it('returns false for null / primitives', () => {
    expect(isAppDefinition(null)).toBe(false);
    expect(isAppDefinition(42)).toBe(false);
  });
});

describe('createAppInstance', () => {
  it('initialises all flags to false', () => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    expect(instance.isRunning).toBe(false);
    expect(instance.isSetupDone).toBe(false);
    expect(instance.isStopping).toBe(false);
    expect(instance.isShuttingDown).toBe(false);
    expect(instance.props).toBeNull();
    expect(instance.mutexName).toBeNull();
  });

  it('binds methods onto setupState', () => {
    const greet = vi.fn();
    const instance = createAppInstance(
      defineApp({ name: 'test', methods: { greet } }),
    );
    expect(typeof instance.setupState.greet).toBe('function');
  });
});

describe('setupApp', () => {
  it('marks isSetupDone and returns success', async () => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    const result = await setupApp(instance, {});
    expect(isSuccess(result)).toBe(true);
    expect(instance.isSetupDone).toBe(true);
  });

  it('calls setup with props and merges returned state', async () => {
    const setup = vi.fn().mockResolvedValue({ value: 42 });
    const instance = createAppInstance(defineApp({ name: 'test', setup }));
    await setupApp(instance, { foo: 'bar' });
    expect(setup).toHaveBeenCalledWith({ foo: 'bar' });
    expect(instance.setupState.value).toBe(42);
  });

  it.each([
    ['isSetupDone', { isSetupDone: true }],
    ['isRunning', { isRunning: true }],
    ['isStopping', { isStopping: true }],
    ['isShuttingDown', { isShuttingDown: true }],
  ])('skips when %s is true', async (_, flags) => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    Object.assign(instance, flags);
    const result = await setupApp(instance, {});
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('setup_app');
  });

  it('skips with error when setup throws', async () => {
    const setup = vi.fn().mockRejectedValue(new Error('boom'));
    const instance = createAppInstance(defineApp({ name: 'test', setup }));
    const result = await setupApp(instance, {});
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(instance.isSetupDone).toBe(false);
  });
});

describe('runApp', () => {
  it('calls entry and returns success', async () => {
    const entry = vi.fn().mockResolvedValue(undefined);
    const instance = createAppInstance(defineApp({ name: 'test', entry }));
    await setupApp(instance, {});
    const result = await runApp(instance);
    expect(isSuccess(result)).toBe(true);
    expect(entry).toHaveBeenCalled();
  });

  it('leaves isRunning true after a successful entry', async () => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    await setupApp(instance, {});
    await runApp(instance);
    expect(instance.isRunning).toBe(true);
  });

  it.each([
    ['not setup', {}],
    ['isRunning', { isSetupDone: true, isRunning: true }],
    ['isStopping', { isSetupDone: true, isStopping: true }],
    ['isShuttingDown', { isSetupDone: true, isShuttingDown: true }],
  ])('skips when %s', async (_, flags) => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    Object.assign(instance, flags);
    const result = await runApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('execute_app');
  });

  it('skips with error and clears isRunning when entry throws', async () => {
    const entry = vi.fn().mockRejectedValue(new Error('entry fail'));
    const instance = createAppInstance(defineApp({ name: 'test', entry }));
    await setupApp(instance, {});
    const result = await runApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(instance.isRunning).toBe(false);
  });
});

describe('stopApp', () => {
  it('calls stop, clears isRunning and isStopping', async () => {
    const stop = vi.fn().mockResolvedValue(undefined);
    const instance = createAppInstance(defineApp({ name: 'test', stop }));
    await startApp(instance, {});
    const result = await stopApp(instance);
    expect(isSuccess(result)).toBe(true);
    expect(stop).toHaveBeenCalled();
    expect(instance.isRunning).toBe(false);
    expect(instance.isStopping).toBe(false);
  });

  it.each([
    ['not running', { isRunning: false }],
    ['isStopping', { isRunning: true, isStopping: true }],
    ['isShuttingDown', { isRunning: true, isShuttingDown: true }],
  ])('skips when %s', async (_, flags) => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    await startApp(instance, {});
    Object.assign(instance, flags);
    const result = await stopApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('stop_app');
  });

  it('skips with error when stop throws but still clears state', async () => {
    const stop = vi.fn().mockRejectedValue(new Error('stop fail'));
    const instance = createAppInstance(defineApp({ name: 'test', stop }));
    await startApp(instance, {});
    const result = await stopApp(instance);
    expect(result.skip).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(instance.isRunning).toBe(false);
    expect(instance.isStopping).toBe(false);
  });
});

describe('shutdownApp', () => {
  it('calls shutdown and resets all instance state', async () => {
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const instance = createAppInstance(defineApp({ name: 'test', shutdown }));
    await startApp(instance, { foo: 1 });
    const result = await shutdownApp(instance);
    expect(isSuccess(result)).toBe(true);
    expect(shutdown).toHaveBeenCalled();
    expect(instance.isRunning).toBe(false);
    expect(instance.isSetupDone).toBe(false);
    expect(instance.isStopping).toBe(false);
    expect(instance.isShuttingDown).toBe(false);
    expect(instance.props).toBeNull();
  });

  it('skips when isShuttingDown is true', async () => {
    const instance = createAppInstance(defineApp({ name: 'test' }));
    instance.isShuttingDown = true;
    const result = await shutdownApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.code).toBe('shutdown_app');
  });

  it('skips with error when shutdown throws but still resets state', async () => {
    const shutdown = vi.fn().mockRejectedValue(new Error('shutdown fail'));
    const instance = createAppInstance(defineApp({ name: 'test', shutdown }));
    await setupApp(instance, {});
    const result = await shutdownApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect(instance.isSetupDone).toBe(false);
  });
});

describe('mutex', () => {
  it('serializes concurrent setupApp + runApp so entry sees isSetupDone', async () => {
    const order: string[] = [];

    const setup = vi.fn().mockImplementation(async () => {
      await Promise.resolve();
      order.push('setup-done');
    });

    const entry = vi.fn().mockImplementation(async () => {
      order.push('entry-start');
    });

    const instance = createAppInstance(
      defineApp({ name: 'test', setup, entry }),
    );

    const [setupResult, runResult] = await Promise.all([
      setupApp(instance, {}),
      runApp(instance),
    ]);

    expect(isSuccess(setupResult)).toBe(true);
    expect(isSuccess(runResult)).toBe(true);
    expect(order).toEqual(['setup-done', 'entry-start']);
  });

  it('second concurrent setupApp skips after the first completes', async () => {
    const instance = createAppInstance(defineApp({ name: 'test' }));

    const [r1, r2] = await Promise.all([
      setupApp(instance, {}),
      setupApp(instance, {}),
    ]);

    const successes = [r1, r2].filter(r => isSuccess(r));
    const skips = [r1, r2].filter(r => isSkip(r));
    expect(successes).toHaveLength(1);
    expect(skips).toHaveLength(1);
  });

  it('sets mutexName during execution and clears it after', async () => {
    // Intercept mutexName via a promise that resolves after setup runs
    let capturedName: string | null = null;

    const instance = createAppInstance(
      defineApp({
        name: 'test',
        setup() {
          capturedName = instance.mutexName;
          return {};
        },
      }),
    );

    await setupApp(instance, {});

    expect(capturedName).toBe('setup');
    expect(instance.mutexName).toBeNull();
  });
});

describe('startApp', () => {
  it('returns a running app instance on success', async () => {
    const def = defineApp({ name: 'test' });
    const result = await startApp(def, {});
    expect(isSuccess(result)).toBe(true);
    expect(result.app).toBeDefined();
  });

  it('skips when setup throws', async () => {
    const def = defineApp({
      name: 'test',
      setup: vi.fn().mockRejectedValue(new Error()),
    });
    const result = await startApp(def, {});
    expect(isSkip(result)).toBe(true);
  });

  it('skips and calls shutdownApp when entry throws', async () => {
    const shutdown = vi.fn().mockResolvedValue(undefined);
    const def = defineApp({
      name: 'test',
      entry: vi.fn().mockRejectedValue(new Error('entry fail')),
      shutdown,
    });
    const result = await startApp(def, {});
    expect(isSkip(result)).toBe(true);
    expect(shutdown).toHaveBeenCalled();
  });
});
