import {
  type AnyFunction,
  AsyncIterableQueue,
  type Awaitable,
  CancellablePromise,
  type Data,
  type ExecResult,
  ResourcePool,
  captureStackTrace,
  catchError,
  def,
  isFunction,
  isSkip,
  toError,
} from '@andrew_l/toolkit';
import type { AppDefinition } from './app.js';
import { defineApp } from './app.js';
import { CONFIG } from './config.js';
import { log } from './logger.js';
import { filePathFromStack } from './utils/filePathFromStack.ts';
import type { ExtractPropTypes, ObjectPropsOptions } from './utils/props.js';

export type WorkerSuccessData = { [x: string]: unknown };
export type WorkerSkipData = { error?: boolean; [x: string]: unknown };
export type WorkerResult = ExecResult<WorkerSuccessData, WorkerSkipData>;

/**
 * Base context bag emitted by strategies per task. Strategies extend this with typed fields.
 * @group Worker
 */
export interface WorkerStrategyContext {
  [key: string]: unknown;
}

/**
 * Pluggable trigger source. Drives when tasks are enqueued.
 * @group Worker
 */
export interface WorkerStrategy<
  C extends WorkerStrategyContext = WorkerStrategyContext,
> {
  doSetup(opts: { worker: WorkerInstance }): Awaitable<void>;
  startSignal(): void;
  stopSignal(done: () => void): void;
  doShutdown(): Awaitable<void>;
  getExecutionContext(): C;
  executeSignal?(
    ctx: WorkerDefinition.EntryContext<WorkerStrategy<C>>,
  ): Awaitable<ExecResult>;
  completeSignal?(
    ctx: WorkerDefinition.EntryContext<WorkerStrategy<C>>,
    result: WorkerResult | WorkerResult[],
  ): Awaitable<void>;
  overloadedSignal?(): void;
  availableSignal?(): void;
  handleEntryError?(err: Error): WorkerResult;
}

export namespace WorkerDefinition {
  /**
   * Entry function that will be called each time when worker handle a job
   */
  export type EntryFn<Context extends Data, Props extends Data> = (
    this: Context,
    props: Props,
  ) => Awaitable<WorkerResult | WorkerResult[] | void>;

  export type SetupFn<Context extends Data, Props extends Data, Result> = (
    this: Context,
    props: Props,
  ) => Awaitable<Result>;

  export type EntryContext<T extends WorkerStrategy = WorkerStrategy> = {
    worker: WorkerInstance<T>;
  } & TaskContext<T>;

  export type SetupContext<T extends Data = Data> = T & {
    worker: WorkerInstance;
  };

  export type RuntimeContext<T extends Data = Data> = T & {
    worker: WorkerInstance;
  };

  export type TaskContext<T extends WorkerStrategy> =
    T extends WorkerStrategy<infer X> ? X : never;
}

/**
 * Worker definition — extends AppDefinition with strategy, per-task entry, and concurrency config.
 * @group Worker
 */
export interface WorkerDefinition<
  P extends ObjectPropsOptions = {},
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
  C extends WorkerStrategy = WorkerStrategy,
  RuntimeContext extends
    WorkerDefinition.RuntimeContext = WorkerDefinition.RuntimeContext<S & M>,
  EntryContext extends
    WorkerDefinition.EntryContext = WorkerDefinition.EntryContext<C> & S & M,
  SetupContext extends
    WorkerDefinition.SetupContext = WorkerDefinition.SetupContext<M>,
> extends AppDefinition<P, S, M, RuntimeContext, EntryContext, SetupContext> {
  /**
   * Entry function that will be called each time when worker handle a job
   */
  entry?(
    this: EntryContext,
    props: ExtractPropTypes<P>,
  ): Awaitable<WorkerResult | WorkerResult[] | void>;

  /**
   * Setup function will be called once while worker setup.
   */
  setup?(this: SetupContext, props: ExtractPropTypes<P>): Awaitable<S>;

  executeStrategy: C;

  /**
   * Maximum limit of queued tasks
   * @default 50
   */
  taskLimit?: number;

  /**
   * Amount of task to be executed in parallel
   * @default 2
   */
  taskParallel?: number;

  /**
   * Disable worker
   * @default false
   */
  disabled?: boolean;
}

/**
 * Runtime state of a worker instance. Extends AppInstance with task queue and pool.
 * Managed with the standard startApp / stopApp / shutdownApp lifecycle.
 * @group Worker
 */
export interface WorkerInstance<C extends WorkerStrategy = WorkerStrategy> {
  definition: WorkerDefinition<{}, {}, {}, C>;
  queue: AsyncIterableQueue<WorkerDefinition.TaskContext<C>>;
  pool: ResourcePool<symbol>;
  runTask: CancellablePromise<void> | null;
  overloadedSignaled: boolean;

  readonly queueMaxSize: number;

  readonly taskParallel: number;

  /**
   * Tasks queue size
   */
  readonly queueSize: number;

  /**
   * Check if the worker is overloaded (e.g., queue length is high)
   */
  readonly isOverloaded: boolean;

  /**
   * Returns true when worker do nothing
   */
  readonly isIdle: boolean;

  /**
   * Add task into execution queue
   */
  addTask(ctx: WorkerDefinition.TaskContext<C>): void;
}

const WORKER_DEF = Symbol('worker-definition');

function makePool(size: number): ResourcePool<symbol> {
  return new ResourcePool<symbol>({
    poolSize: size,
    auto: true,
    createResource: () => Symbol('worker-slot'),
  });
}

/**
 * Create a runtime WorkerInstance from a WorkerDefinition.
 * Use with startApp / stopApp / shutdownApp.
 * @group Worker
 */
export function createWorkerInstance<C extends WorkerStrategy>(
  definition: WorkerDefinition<{}, {}, {}, C>,
): WorkerInstance<C> {
  const instance: WorkerInstance<C> = {
    definition,
    queue: new AsyncIterableQueue(),
    pool: makePool(definition.taskParallel ?? 2),
    runTask: null,
    queueMaxSize: definition.taskLimit ?? 50,
    taskParallel: definition.taskParallel ?? 2,
    overloadedSignaled: false,
    addTask(ctx) {
      addWorkerTask(this, ctx);
    },
    get isOverloaded() {
      return this.queueSize > this.queueMaxSize * 0.8;
    },
    get isIdle() {
      return this.pool.isIdle && this.queueSize === 0;
    },
    get queueSize() {
      return (this.queue as any)._queue.items.length;
    },
  };

  return instance;
}

/**
 * Enqueue a task context on the worker. Fires backpressure signals at 80% capacity.
 * @group Worker
 */
export function addWorkerTask<C extends WorkerStrategy>(
  instance: WorkerInstance<C>,
  ctx: WorkerDefinition.TaskContext<C>,
): void {
  instance.queue.put(ctx);
}

async function doWork<C extends WorkerStrategy>(
  instance: WorkerInstance<C>,
  entryContext: WorkerDefinition.EntryContext<C>,
  props: Data,
  abortSignal: AbortSignal,
): Promise<void> {
  const { executeStrategy, logging, name, entry } = instance.definition;

  if (isFunction(executeStrategy.executeSignal)) {
    const [signalError, signalResult] = await catchError(() =>
      executeStrategy.executeSignal!(entryContext),
    );

    if (signalError) {
      log.error(
        'Execute signal execution strategy error. Drop from processing.',
        signalError,
      );
      return;
    }

    if (isSkip(signalResult)) {
      log.warn(
        'Execute signal execution strategy returns skip. Drop from processing.',
        signalResult,
      );
      return;
    }
  }

  let [executeError, executeResult] = await catchError(() =>
    entry?.call(entryContext, props),
  );

  if (executeError) {
    if (executeStrategy.handleEntryError) {
      executeResult = executeStrategy.handleEntryError(executeError);
    }

    if (!executeResult) {
      executeResult = {
        skip: true,
        error: true,
        code: 'critical_error',
        reason: executeError.message,
        stack: executeError.stack,
      };
    }
  } else if (
    !executeResult ||
    (Array.isArray(executeResult) && !executeResult.length)
  ) {
    executeResult = { success: true, code: 'void' };
  }

  const results = Array.isArray(executeResult)
    ? executeResult
    : [executeResult!];

  let hasError = false;
  let hasSkip = false;

  for (const result of results) {
    hasError = hasError || (isSkip(result) && !!result.error);
    hasSkip = isSkip(result);
  }

  if (logging ?? true) {
    if (hasError) {
      log.error('[%s] Task error', name, results);
    } else if (hasSkip) {
      log.warn('[%s] Task skipped', name, results);
    } else {
      log.debug('[%s] Task completed', name, results);
    }
  }

  if (executeStrategy.completeSignal) {
    const [completeError] = await catchError(() =>
      executeStrategy.completeSignal!(entryContext, executeResult!),
    );

    if (completeError) {
      log.error('Complete signal execution strategy error', completeError);
    }
  }
}

/**
 * Define a background worker with a pluggable execution strategy.
 * Returns a WorkerDefinition that can be run with createWorkerInstance + startApp.
 * @group Worker
 */
export function defineWorker<
  P extends ObjectPropsOptions,
  S extends Record<string, any>,
  M extends Record<string, AnyFunction>,
  C extends WorkerStrategy = WorkerStrategy,
>(definition: WorkerDefinition<P, S, M, C>): WorkerDefinition<P, S, M, C> {
  const result = defineApp({
    filePath: filePathFromStack(captureStackTrace(defineWorker)),
    ...definition,
    setup(props) {
      return setupWorker(this, definition, props);
    },
    entry(props) {
      return startWorker(this, definition, props);
    },
    stop(props) {
      return stopWorker(this, definition, props);
    },
    shutdown(props) {
      return workerShutdown(this, definition, props);
    },
  }) as WorkerDefinition<P, S, M, C>;

  result.disabled = result.disabled || CONFIG.WORKER_DISABLED.has(result.name);
  def(result, WORKER_DEF, true);

  return result;
}

function setupWorker<
  P extends ObjectPropsOptions,
  S extends Data,
  M extends Record<string, AnyFunction>,
>(
  setupContext: M,
  definition: WorkerDefinition<
    P,
    S,
    M,
    WorkerStrategy,
    WorkerDefinition.RuntimeContext,
    WorkerDefinition.SetupContext<M>
  >,
  props: ExtractPropTypes<P>,
): Promise<WorkerDefinition.SetupContext<S & M>> {
  const setupFn = definition.setup;
  const ctx: WorkerDefinition.SetupContext<M> = {
    ...setupContext,
    worker: createWorkerInstance(definition),
  };

  return Promise.resolve()
    .then(() => (setupFn ? setupFn.call(ctx, props) : undefined))
    .then(setupResult => {
      return {
        ...ctx,
        ...(setupResult || ({} as S)),
      };
    });
}

async function startWorker(
  runtimeContext: WorkerDefinition.RuntimeContext,
  definition: WorkerDefinition,
  props: Data,
): Promise<void> {
  const worker = runtimeContext.worker;
  const { executeStrategy } = definition;

  await executeStrategy.doSetup({ worker });

  const abortController = new AbortController();
  const abortSignal = abortController.signal;

  const onStopSignal = () => {
    return Promise.resolve()
      .then(() => abortController.abort())
      .then(() =>
        catchError(() =>
          executeStrategy.stopSignal(() => worker.queue.close()),
        ),
      )
      .then(stopResult => {
        const stopError = stopResult[0];

        if (stopError) {
          worker.queue.close();
          log.error('Stop signal error', stopError);
        }
      });
  };

  worker.runTask = new CancellablePromise<void>(
    async (resolve, reject, onCancel) => {
      onCancel(onStopSignal);

      const [setupError] = await catchError(() =>
        executeStrategy.doSetup({
          worker,
        }),
      );

      if (setupError) {
        log.error('Setup execution strategy error.', setupError);
        worker.runTask = null;
        return resolve();
      }

      const [startError] = await catchError(() =>
        executeStrategy.startSignal(),
      );

      if (startError) {
        log.error('Start signal error', startError);
        worker.runTask = null;
        return resolve();
      }

      log.info('Worker started.');

      for await (const taskContext of worker.queue) {
        const jobTicket = await worker.pool.acquire();
        const entryContext: WorkerDefinition.EntryContext<WorkerStrategy> = {
          ...runtimeContext,
          ...taskContext,
        };

        doWork(worker, entryContext, props, abortSignal).finally(() => {
          worker.pool.release(jobTicket);
          workerCheckOverloaded(worker);
        });
      }

      log.info('Wait for completing pool. (used = %d)', worker.pool.usedCount);

      await worker.pool.destroy();
      worker.queue = new AsyncIterableQueue();
      worker.runTask = null;
    },
  );

  worker.runTask.catch(err => {
    log.error('[%s] Worker crash: %s', definition.name, toError(err).message);
  });
}

function workerCheckOverloaded(worker: WorkerInstance): void {
  try {
    if (worker.isOverloaded) {
      if (!worker.definition.executeStrategy.overloadedSignal)
        return void log.warn(
          'Worker under pressure. (queue = %d, limit = %d)',
          worker.queueSize,
          worker.queueMaxSize,
        );

      if (worker.overloadedSignaled) return;

      worker.overloadedSignaled = true;
      worker.definition.executeStrategy.overloadedSignal();
    } else {
      if (!worker.overloadedSignaled) return;
      if (!worker.definition.executeStrategy.availableSignal) {
        log.warn('Worker has capacity to handle more tasks. 🚀');
      } else {
        worker.definition.executeStrategy.availableSignal();
      }

      worker.overloadedSignaled = false;
    }
  } catch (err) {
    log.error('Execute strategy overloaded signaling error', err);
  }
}

async function stopWorker(
  runtimeContext: WorkerDefinition.RuntimeContext,
  definition: WorkerDefinition,
  props: Data,
): Promise<void> {
  const worker = runtimeContext.worker;
  const userStop = worker.definition.stop;

  if (worker.runTask) {
    if (isFunction(userStop)) {
      await userStop.call(runtimeContext, props);
    }

    if (!worker.runTask) return;
    worker.runTask.cancel();
    await worker.runTask.catch(() => {});
    worker.runTask = null;
  }
}

async function workerShutdown(
  runtimeContext: WorkerDefinition.RuntimeContext,
  definition: WorkerDefinition,
  props: Data,
): Promise<void> {
  const worker = runtimeContext.worker;
  const userShutdown = definition.shutdown;

  if (isFunction(userShutdown)) {
    await userShutdown.call(runtimeContext, props);
  }

  await definition.executeStrategy.doShutdown();

  worker.queue = new AsyncIterableQueue<any>();
  worker.pool = makePool(definition.taskParallel ?? 2);
}

/**
 * Returns true if the value was created by defineWorker.
 * @group Worker
 */
export function isWorkerDefinition(value: unknown): value is WorkerDefinition {
  return (value as any)?.[WORKER_DEF] === true;
}

/**
 * Returns true if the value is a WorkerInstance.
 * @group Worker
 */
export function isWorkerInstance(value: unknown): value is WorkerInstance {
  return isWorkerDefinition((value as WorkerInstance)?.definition);
}
