import {
  type AnyFunction,
  AsyncIterableQueue,
  type Awaitable,
  CancellablePromise,
  type Data,
  type ExecResult,
  type Logger,
  ResourcePool,
  arrayable,
  captureStackTrace,
  catchError,
  def,
  isFunction,
  isSkip,
  noop,
  toError,
} from '@andrew_l/toolkit';
import type { AppDefinition } from './app.js';
import { defineApp } from './app.js';
import { CONFIG } from './config.js';
import { filePathFromStack } from './utils/filePathFromStack.ts';
import type { ExtractPropTypes, ObjectPropsOptions } from './utils/props.js';

export type WorkerSuccessData = { [x: string]: unknown };
export type WorkerSkipData = { error?: boolean; [x: string]: unknown };
export type WorkerResult = ExecResult<WorkerSuccessData, WorkerSkipData>;

/**
 * @group Types
 */
export namespace WorkerStrategy {
  /**
   * Base context bag emitted by strategies per task. Strategies extend this with typed fields.
   * @group Types
   */
  export interface Context {
    [key: string]: unknown;
  }
}

/**
 * Pluggable trigger source. Drives when tasks are enqueued.
 * @group Types
 */
export interface WorkerStrategy<
  C extends WorkerStrategy.Context = WorkerStrategy.Context,
> {
  doSetup(opts: { worker: WorkerInstance }): Awaitable<void>;
  startSignal(): void;
  stopSignal(done: () => void): void;
  doShutdown(): Awaitable<void>;
  createTask(...args: any[]): C;
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

  export type EntryContext<T extends WorkerStrategy = WorkerStrategy> =
    AppDefinition.EntryContext<
      {
        worker: WorkerInstance<T>;
      } & TaskContext<T>
    >;

  export type SetupContext<T extends Data = Data> = AppDefinition.SetupContext<
    T & { worker: WorkerInstance }
  >;

  export type RuntimeContext<T extends Data = Data> =
    AppDefinition.RuntimeContext<
      T & {
        worker: WorkerInstance;
      }
    >;

  export type TaskContext<T extends WorkerStrategy> =
    T extends WorkerStrategy<infer X> ? X : never;
}

/**
 * Worker definition — extends AppDefinition with strategy, per-task entry, and concurrency config.
 * @group Types
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
    abortSignal: AbortSignal,
  ): Awaitable<WorkerResult | WorkerResult[] | void>;

  /**
   * Setup function will be called once while worker setup.
   */
  setup?(this: SetupContext, props: ExtractPropTypes<P>): Awaitable<S>;

  executeStrategy: C | ((props: ExtractPropTypes<P>) => C);

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
 * @group Types
 */
export interface WorkerInstance<C extends WorkerStrategy = WorkerStrategy> {
  definition: WorkerDefinition<{}, {}, {}, C>;
  queue: AsyncIterableQueue<WorkerDefinition.TaskContext<C>>;
  pool: ResourcePool<symbol>;
  runTask: CancellablePromise<void> | null;
  executeStrategy: C | null;
  overloadedSignaled: boolean;
  log: Logger;

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

function createWorkerPool(size: number): ResourcePool<symbol> {
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
  definition: WorkerDefinition<any, {}, {}, C>,
  logger: Logger,
): WorkerInstance<C> {
  const instance: WorkerInstance<C> = {
    definition,
    executeStrategy: null,
    log: logger,
    queue: new AsyncIterableQueue(),
    pool: createWorkerPool(definition.taskParallel ?? 2),
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
  checkWorkerPressure(instance);
}

var NOOP_EXECUTE_SIGNAL = () => ({ success: true, code: 'ok' }) as ExecResult;

function executeWorkerTask<C extends WorkerStrategy>(
  instance: WorkerInstance<C>,
  entryContext: WorkerDefinition.EntryContext<C>,
  props: Data,
  abortSignal: AbortSignal,
): Promise<void> {
  const { log } = instance;
  const entry = instance.definition.entry || noop;
  const executeStrategy = instance.executeStrategy!;
  const completeSignal = executeStrategy.completeSignal || noop;
  const executeSignal = executeStrategy.executeSignal || NOOP_EXECUTE_SIGNAL;

  return Promise.resolve()
    .then(() => catchError(() => executeSignal(entryContext)))
    .then(([signalError, signalResult]) => {
      if (signalError) {
        return void log.error('Strategy executeSignal error, dropping task', {
          error: signalError,
        });
      } else if (isSkip(signalResult)) {
        return void log.warn(
          'Strategy executeSignal returned skip, dropping task',
          signalResult,
        );
      }

      const taskAbort = new AbortController();
      const handleAbort = () => {
        if (!taskAbort.signal.aborted) {
          taskAbort.abort(abortSignal.reason);
        }
      };

      abortSignal.addEventListener('abort', handleAbort);

      return Promise.resolve()
        .then(() =>
          catchError(() => entry.call(entryContext, props, taskAbort.signal)),
        )
        .then(([executeError, executeResult]) => {
          abortSignal.removeEventListener('abort', handleAbort);

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

          const results = arrayable(executeResult);

          let hasError = false;
          let hasSkip = false;

          for (const result of results) {
            hasError = hasError || (isSkip(result) && !!result.error);
            hasSkip = isSkip(result);
          }

          if (hasError) {
            log.error('Task error', results);
          } else if (hasSkip) {
            log.warn('Task skipped', results);
          } else {
            log.debug('Task completed', results);
          }

          return catchError(() => completeSignal(entryContext, executeResult));
        })
        .then(([completeError]) => {
          if (completeError) {
            log.error('Strategy completeSignal error', {
              error: completeError,
            });
          }
        });
    });
}

/**
 * Define a background worker with a pluggable execution strategy.
 * Returns a WorkerDefinition that can be run with createWorkerInstance + startApp.
 *
 * @example
 * ```ts
 * import { defineWorker, IntervalStrategy } from '@andrew_l/app';
 *
 * export default defineWorker({
 *   name: 'clock',
 *   executeStrategy: new IntervalStrategy({
 *     intervalSeconds: 1,
 *   }),
 *   entry() {
 *     this.log.info('tick=%d', this.timerSequence);
 *   },
 *   async shutdown() {
 *     await delay(1000);
 *   },
 * });
 * ```
 *
 * @group Main
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
      return runWorkerLoop(this, props);
    },
    stop(props) {
      return stopWorker(this, props);
    },
    shutdown(props) {
      return shutdownWorker(this, props);
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
  setupContext: AppDefinition.SetupContext<M>,
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
    worker: createWorkerInstance(definition, setupContext.log),
  };

  if (isFunction(definition.executeStrategy)) {
    ctx.worker.executeStrategy = definition.executeStrategy(props);
  } else {
    ctx.worker.executeStrategy = definition.executeStrategy;
  }

  return Promise.resolve()
    .then(() => ctx.worker.executeStrategy!.doSetup(ctx))
    .then(() => (setupFn ? setupFn.call(ctx, props) : undefined))
    .then(setupResult => {
      return {
        ...ctx,
        ...(setupResult || ({} as S)),
      };
    });
}

function runWorkerLoop(
  runtimeContext: WorkerDefinition.RuntimeContext,
  props: Data,
): void {
  const worker = runtimeContext.worker;
  const executeStrategy = worker.executeStrategy!;

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
          worker.log.error('Strategy stopSignal error', { error: stopError });
        }
      });
  };

  worker.runTask = new CancellablePromise<void>(
    async (resolve, _reject, onCancel) => {
      onCancel(onStopSignal);

      const [startError] = await catchError(() =>
        executeStrategy.startSignal(),
      );

      if (startError) {
        worker.log.error('Strategy startSignal error', { error: startError });
        worker.runTask = null;
        return resolve();
      }

      worker.log.info('Worker started (parallel=%d)', worker.taskParallel);

      for await (const taskContext of worker.queue) {
        const jobTicket = await worker.pool.acquire();
        const entryContext: WorkerDefinition.EntryContext<WorkerStrategy> = {
          ...runtimeContext,
          ...taskContext,
        };

        executeWorkerTask(worker, entryContext, props, abortSignal).finally(
          () => {
            worker.pool.release(jobTicket);
            checkWorkerPressure(worker);
          },
        );
      }

      if (worker.pool.usedCount > 0) {
        worker.log.info(
          'Draining task pool (active=%d)',
          worker.pool.usedCount,
        );
      }

      await worker.pool.destroy();
      worker.queue = new AsyncIterableQueue();
      worker.runTask = null;
      resolve();
    },
  );

  worker.runTask.catch(err => {
    worker.log.error('Worker crash: %s', { error: toError(err) });
  });
}

function checkWorkerPressure(worker: WorkerInstance): void {
  const executeStrategy = worker.executeStrategy;

  try {
    if (worker.isOverloaded) {
      if (!executeStrategy || !executeStrategy.overloadedSignal)
        return void worker.log.warn(
          'Worker under pressure (queue=%d, limit=%d)',
          worker.queueSize,
          worker.queueMaxSize,
        );

      if (worker.overloadedSignaled) return;

      worker.overloadedSignaled = true;
      executeStrategy.overloadedSignal();
    } else {
      if (!worker.overloadedSignaled) return;
      if (!executeStrategy || !executeStrategy.availableSignal) {
        worker.log.warn('Worker capacity restored');
      } else {
        executeStrategy.availableSignal();
      }

      worker.overloadedSignaled = false;
    }
  } catch (err) {
    worker.log.error('Backpressure signal error', { error: err });
  }
}

function stopWorker(
  runtimeContext: WorkerDefinition.RuntimeContext,
  props: Data,
): Promise<void> {
  const worker = runtimeContext.worker;
  const definition = worker.definition;
  const userStop = definition.stop || noop;
  const runTask = worker.runTask;

  if (!runTask) {
    return Promise.resolve();
  }

  return Promise.resolve()
    .then(() => userStop.call(runtimeContext, props))
    .finally(() => {
      runTask.cancel();
      return runTask.finally(() => {
        worker.runTask = null;
      });
    });
}

function shutdownWorker(
  runtimeContext: WorkerDefinition.RuntimeContext,
  props: Data,
): Promise<void> {
  const worker = runtimeContext.worker;
  const executeStrategy = worker.executeStrategy!;
  const definition = worker.definition;
  const userShutdown = definition.shutdown || noop;

  return Promise.resolve()
    .then(() => userShutdown.call(runtimeContext, props))
    .then(() => executeStrategy.doShutdown())
    .finally(() => {
      worker.queue = new AsyncIterableQueue<any>();
      worker.pool = createWorkerPool(definition.taskParallel ?? 2);
    });
}

/**
 * Returns true if the value was created by defineWorker.
 * @group Utils
 */
export function isWorkerDefinition(value: unknown): value is WorkerDefinition {
  return (value as any)?.[WORKER_DEF] === true;
}

/**
 * Returns true if the value is a WorkerInstance.
 * @group Utils
 */
export function isWorkerInstance(value: unknown): value is WorkerInstance {
  return isWorkerDefinition((value as WorkerInstance)?.definition);
}
