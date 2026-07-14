import { type Data, type Logger, isSkip } from '@andrew_l/toolkit';
import { describe, expect, it, vi } from 'vitest';
import {
  type AppDefinition,
  type AppInstance,
  shutdownApp,
  startApp,
  stopApp,
} from './app.js';
import {
  type WorkerInstance,
  type WorkerStrategy,
  addWorkerTask,
  createWorkerInstance,
  defineWorker,
  isWorkerDefinition,
  isWorkerInstance,
} from './worker.js';

function makeStrategy(): WorkerStrategy {
  return {
    doSetup: vi.fn().mockResolvedValue({}),
    startSignal: vi.fn(),
    stopSignal: vi.fn((done: () => void) => done()),
    doShutdown: vi.fn().mockResolvedValue(undefined),
    createTask: vi.fn().mockReturnValue({}),
  };
}

function makeLogger(): Logger {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  } as any;
}

async function launchApp(
  def: AppDefinition,
  props: Data,
): Promise<AppInstance> {
  const result = await startApp(def, props);

  if (isSkip(result)) {
    throw new Error('Failed to start app:' + result.code);
  }

  return result.app;
}

describe('defineWorker', () => {
  it('returns definition with provided fields', () => {
    const strategy = makeStrategy();
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: strategy,
      taskParallel: 4,
      taskLimit: 20,
    });
    expect(def.name).toBe('test');
    expect(def.taskParallel).toBe(4);
    expect(def.taskLimit).toBe(20);
    expect(def.executeStrategy).toBe(strategy);
  });

  it('disabled is false by default', () => {
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
    });
    expect(def.disabled).toBe(false);
  });
});

describe('isWorkerDefinition', () => {
  it('returns true for a defineWorker result', () => {
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
    });
    expect(isWorkerDefinition(def)).toBe(true);
  });

  it('returns false for a plain object', () => {
    expect(isWorkerDefinition({ name: 'test' })).toBe(false);
  });

  it('returns false for null / primitives', () => {
    expect(isWorkerDefinition(null)).toBe(false);
    expect(isWorkerDefinition(42)).toBe(false);
  });
});

describe('isWorkerInstance', () => {
  it('returns true for a createWorkerInstance result', () => {
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
    });
    expect(isWorkerInstance(createWorkerInstance(def, makeLogger()))).toBe(
      true,
    );
  });

  it('returns false for a plain object', () => {
    expect(isWorkerInstance({ name: 'test' })).toBe(false);
  });
});

describe('createWorkerInstance', () => {
  function makeInstance(overrides: Record<string, any> = {}) {
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      ...overrides,
    });
    return createWorkerInstance(def, makeLogger());
  }

  it('initialises fields correctly', () => {
    const instance = makeInstance();
    expect(instance.runTask).toBeNull();
    expect(instance.overloadedSignaled).toBe(false);
    expect(instance.taskParallel).toBe(2);
    expect(instance.queueMaxSize).toBe(50);
  });

  it('queueSize returns 0 initially', () => {
    expect(makeInstance().queueSize).toBe(0);
  });

  it('isIdle returns true when nothing queued or running', () => {
    expect(makeInstance().isIdle).toBe(true);
  });

  it('isOverloaded returns false when queueSize is 0', () => {
    expect(makeInstance().isOverloaded).toBe(false);
  });

  it('respects taskParallel and taskLimit overrides', () => {
    const instance = makeInstance({ taskParallel: 5, taskLimit: 100 });
    expect(instance.taskParallel).toBe(5);
    expect(instance.queueMaxSize).toBe(100);
  });
});

describe('addWorkerTask', () => {
  function makeInstance(overrides: Record<string, any> = {}) {
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      ...overrides,
    });
    return createWorkerInstance(def, makeLogger());
  }

  it('increments queueSize', () => {
    const instance = makeInstance();
    addWorkerTask(instance, {} as any);
    expect(instance.queueSize).toBe(1);
    addWorkerTask(instance, {} as any);
    expect(instance.queueSize).toBe(2);
  });

  it('fires overloadedSignal once when queue exceeds 80% of limit', async () => {
    const overloadedSignal = vi.fn();
    const app = await launchApp(
      defineWorker({
        name: 'simple',
        executeStrategy: { ...makeStrategy(), overloadedSignal },
        taskLimit: 5,
      }),
      {},
    );
    const instance = app.setupState.worker as WorkerInstance;

    // queueSize=5 > 5*0.8=4 → overloaded
    for (let i = 0; i < 5; i++) addWorkerTask(instance, {} as any);
    expect(overloadedSignal).toHaveBeenCalledTimes(1);
    expect(instance.overloadedSignaled).toBe(true);
  });

  it('does not fire overloadedSignal again until available', async () => {
    const overloadedSignal = vi.fn();
    const app = await launchApp(
      defineWorker({
        name: 'simple',
        executeStrategy: { ...makeStrategy(), overloadedSignal },
        taskLimit: 5,
      }),
      {},
    );
    const instance = app.setupState.worker as WorkerInstance;

    for (let i = 0; i < 10; i++) addWorkerTask(instance, {} as any);
    expect(overloadedSignal).toHaveBeenCalledTimes(1);
  });

  it('fires availableSignal when pressure drops below threshold', async () => {
    const availableSignal = vi.fn();
    const app = await launchApp(
      defineWorker({
        name: 'simple',
        executeStrategy: { ...makeStrategy(), availableSignal },
        taskLimit: 100,
      }),
      {},
    );

    // taskLimit=100: 80%=80, adding 1 task (queueSize=1) is not overloaded
    const instance = app.setupState.worker as WorkerInstance;
    instance.overloadedSignaled = true;
    addWorkerTask(instance, {} as any);
    expect(availableSignal).toHaveBeenCalledTimes(1);
    expect(instance.overloadedSignaled).toBe(false);
  });
});

describe('entry abortSignal', () => {
  it('is not aborted when entry starts', () => {
    let resolveChecked!: () => void;
    const checked = new Promise<void>(r => {
      resolveChecked = r;
    });

    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      entry: vi.fn().mockImplementation(function (_props, signal: AbortSignal) {
        expect(signal.aborted).toBe(false);
        resolveChecked();
      }),
    });

    return launchApp(def, {}).then(app => {
      const worker = (app.setupState as any).worker as WorkerInstance;
      worker.addTask({});
      return checked.then(() => stopApp(app)).then(() => shutdownApp(app));
    });
  });

  it('is aborted when stopApp is called while entry is running', () => {
    let signalAborted!: (v: boolean) => void;
    const abortDetected = new Promise<boolean>(r => {
      signalAborted = r;
    });

    let releaseEntry!: () => void;
    const entryStarted = new Promise<void>(r => {
      releaseEntry = r;
    });

    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      entry: vi.fn().mockImplementation(function (_props, signal: AbortSignal) {
        releaseEntry();
        return new Promise<void>(resolve => {
          signal.addEventListener('abort', () => {
            signalAborted(signal.aborted);
            resolve();
          });
        });
      }),
    });

    return launchApp(def, {}).then(app => {
      const worker = (app.setupState as any).worker as WorkerInstance;
      worker.addTask({});
      return entryStarted
        .then(() => stopApp(app))
        .then(() => abortDetected)
        .then(aborted => {
          expect(aborted).toBe(true);
        })
        .then(() => shutdownApp(app));
    });
  });

  it('receives abort reason from stopApp', () => {
    let capturedReason!: (v: unknown) => void;
    const reasonReceived = new Promise<unknown>(r => {
      capturedReason = r;
    });

    let releaseEntry!: () => void;
    const entryStarted = new Promise<void>(r => {
      releaseEntry = r;
    });

    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      entry: vi.fn().mockImplementation(function (_props, signal: AbortSignal) {
        releaseEntry();
        return new Promise<void>(resolve => {
          signal.addEventListener('abort', () => {
            capturedReason(signal.reason);
            resolve();
          });
        });
      }),
    });

    return launchApp(def, {}).then(app => {
      const worker = (app.setupState as any).worker as WorkerInstance;
      worker.addTask({});
      return entryStarted
        .then(() => stopApp(app))
        .then(() => reasonReceived)
        .then(reason => {
          expect(reason).toBeDefined();
        })
        .then(() => shutdownApp(app));
    });
  });
});

describe('worker lifecycle', () => {
  it('calls doSetup with worker on start', async () => {
    const strategy = makeStrategy();
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: strategy,
    });
    const app = await launchApp(def, {});

    expect(strategy.doSetup).toHaveBeenCalledWith(
      expect.objectContaining({ worker: expect.anything() }),
    );

    await stopApp(app);
    await shutdownApp(app);
  });

  it('calls stopSignal on stopApp', async () => {
    const strategy = makeStrategy();
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: strategy,
    });
    const app = await launchApp(def, {});
    await stopApp(app);
    expect(strategy.stopSignal).toHaveBeenCalled();
    await shutdownApp(app);
  });

  it('calls doShutdown on shutdownApp', async () => {
    const strategy = makeStrategy();
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: strategy,
    });
    const app = await launchApp(def, {});
    await stopApp(app);
    await shutdownApp(app);
    expect(strategy.doShutdown).toHaveBeenCalled();
  });

  it('executes entry for each queued task', async () => {
    let resolveEntry!: () => void;
    const entryExecuted = new Promise<void>(r => {
      resolveEntry = r;
    });
    const entry = vi.fn().mockImplementation(() => resolveEntry());
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      entry,
    });
    const app = await launchApp(def, {});
    const worker = (app.setupState as any).worker as WorkerInstance;
    worker.addTask({});
    await entryExecuted;
    expect(entry).toHaveBeenCalled();
    await stopApp(app);
    await shutdownApp(app);
  });

  it('calls handleEntryError when entry throws', async () => {
    let resolveHandled!: () => void;
    const handled = new Promise<void>(r => {
      resolveHandled = r;
    });
    const handleEntryError = vi.fn().mockImplementation(() => {
      resolveHandled();
      return { skip: true, error: true, code: 'critical_error' };
    });
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: { ...makeStrategy(), handleEntryError },
      entry: vi.fn().mockRejectedValue(new Error('task fail')),
    });
    const app = await launchApp(def, {});
    const worker = (app.setupState as any).worker as WorkerInstance;
    worker.addTask({});
    await handled;
    expect(handleEntryError).toHaveBeenCalledWith(expect.any(Error));
    await stopApp(app);
    await shutdownApp(app);
  });

  it('calls completeSignal with execution result', async () => {
    let resolveComplete!: () => void;
    const completed = new Promise<void>(r => {
      resolveComplete = r;
    });
    const completeSignal = vi.fn().mockImplementation(() => resolveComplete());
    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: { ...makeStrategy(), completeSignal },
      entry: vi.fn().mockResolvedValue({ success: true, code: 'done' }),
    });
    const app = await launchApp(def, {});
    const worker = (app.setupState as any).worker as WorkerInstance;
    worker.addTask({});
    await completed;
    expect(completeSignal).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ success: true }),
    );
    await stopApp(app);
    await shutdownApp(app);
  });

  it('entry has access and able to modify setup context', async () => {
    let capturedEntryContext: any;
    let capturedSetupContext: any;
    let capturedMethodContext: any;

    const def = defineWorker({
      name: 'test',
      logger: false,
      executeStrategy: makeStrategy(),
      methods: {
        testMethod() {
          capturedMethodContext = this;
        },
      },
      setup() {
        capturedSetupContext = this;

        return {
          modified: false,
          task: false,
        };
      },
      entry() {
        this.testMethod();

        capturedEntryContext = this;
        this.modified = true;
        this.task = true;
      },
    });

    const app = await launchApp(def, {});
    const worker = (app.setupState as any).worker as WorkerInstance;
    worker.addTask({ task: 1 });
    await stopApp(app);
    await shutdownApp(app);

    expect(capturedEntryContext.modified).toBe(true);
    expect(capturedEntryContext.task).toBe(true);
    expect(capturedMethodContext.modified).toBe(true);
    expect(capturedMethodContext.task).toBe(false);
  });
});
