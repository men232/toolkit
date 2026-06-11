import {
  type AnyFunction,
  type Awaitable,
  type Data,
  type ExecResult,
  captureStackTrace,
  def,
  isFunction,
  isSkip,
  toError,
} from '@andrew_l/toolkit';
import type { ExtractPropTypes, ObjectPropsOptions } from './utils/props.js';

import { EventEmitter } from 'node:events';
import { CONFIG } from './config.js';
import { log } from './logger.js';
import { extractOptionsArgs } from './utils/args.js';
import { filePathFromStack } from './utils/filePathFromStack.js';
import { isMainFile } from './utils/isMainFile.js';

/**
 * Shape of an application — name, typed props, lifecycle hooks, and optional methods.
 * @group Main
 */
export interface AppDefinition<
  P extends ObjectPropsOptions = {},
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
  RuntimeContext extends Data = S & M,
  EntryContext extends Data = S & M,
  SetupContext extends Data = M,
> {
  /**
   * Name of your awesome application
   */
  name: string;

  /**
   * Describe what your application does
   */
  description?: string;

  /**
   * Props options to be parsed from cli arguments of env variables
   */
  props?: P;

  /**
   * Whatever to log application states
   * @default true
   */
  logging?: boolean;

  /**
   * Path to the file where this definition exports default
   * Usually you should not use this option, because it tracks automatically
   */
  filePath?: string | null;

  /**
   * Setup function to initialize application. Will be called once
   */
  setup?(this: SetupContext, props: ExtractPropTypes<P>): Awaitable<S>;

  /**
   * Custom methods which will be available under `this` context
   */
  methods?: M & ThisType<RuntimeContext>;

  /**
   * Entry function that will be called each time when application starts
   */
  entry?(this: EntryContext, props: ExtractPropTypes<P>): Awaitable<any>;

  /**
   * Stop function that will be called each time when application stops
   */
  stop?(this: RuntimeContext, props: ExtractPropTypes<P>): Awaitable<void>;

  /**
   * Shutdown function that will be called before application/process graceful shutdown
   */
  shutdown?(this: RuntimeContext, props: ExtractPropTypes<P>): Awaitable<void>;
}

const EVENT_LISTENER_MAP = new WeakMap<AppInstance, EventEmitter>();

/**
 * Runtime state of a created app instance.
 * @group Main
 */
export interface AppInstance<
  P extends ObjectPropsOptions = {},
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
> {
  definition: AppDefinition<P, S, M>;
  props: ExtractPropTypes<P> | null;
  setupState: Data;
  /** @internal */
  mutexName: string | null;
  /** @internal */
  mutexQueue: Promise<void>;
  isRunning: boolean;
  isSetupDone: boolean;
  isStopping: boolean;
  isShuttingDown: boolean;
}

const APP_DEF = Symbol('app-definition');

/**
 * Define an application with typed props and lifecycle hooks.
 *
 * When executed directly (`node app.ts`), the CLI is launched automatically.
 * @group Main
 * @example
 * ```ts
 * export default defineApp({
 *   name: 'server',
 *   props: {
 *     port: { type: Number, default: () => 3000 },
 *   },
 *   setup() {
 *     return { server: createServer() };
 *   },
 *   async entry(props) {
 *     await this.server.listen(props.port);
 *   },
 *   async stop() {
 *     await this.server.close();
 *   },
 * });
 * ```
 */
export function defineApp<
  P extends ObjectPropsOptions,
  S extends Record<string, any>,
  M extends Record<string, AnyFunction>,
>(definition: AppDefinition<P, S, M>): AppDefinition<P, S, M> {
  const result: AppDefinition<P, S, M> = {
    logging: true,
    filePath: filePathFromStack(captureStackTrace(defineApp)),
    ...definition,
  };

  def(result, APP_DEF, true);

  if (!CONFIG.IS_VRUN) {
    if (result.filePath) {
      if (isMainFile(result.filePath)) {
        // TODO: make sure that filePath export default this definition
        import('./cli/index.js').then(m => {
          m.cli.runApp({
            cliName: 'app',
            scriptFile: result.filePath!,
            argv: extractOptionsArgs(process.argv.slice(1)),
          });
        });
      }
    } else {
      // log.warn('Failed to detect script file from execution stack: %s', stack);
    }
  }

  return result;
}

/**
 * Create a new runtime instance from an app definition.
 * @group Lifecycle
 * @example
 * ```ts
 * const instance = createAppInstance(myApp);
 * await setupApp(instance, { port: 3000 });
 * await runApp(instance);
 * ```
 */
export function createAppInstance<
  P extends ObjectPropsOptions,
  S extends Record<string, any>,
  M extends Record<string, AnyFunction>,
>(definition: AppDefinition<P, S, M>): AppInstance<P, S, M> {
  return {
    definition,
    props: null,
    setupState: createSetupState(definition),
    mutexName: null,
    mutexQueue: Promise.resolve(),
    isRunning: false,
    isSetupDone: false,
    isStopping: false,
    isShuttingDown: false,
  };
}

/**
 * Returns true if the value was created by `defineApp`.
 * @group Utils
 */
export function isAppDefinition(value: unknown): value is AppDefinition {
  return (value as any)?.[APP_DEF] === true;
}

/**
 * Run setup and entry in one call. Shuts down automatically if entry fails.
 * @group Lifecycle
 * @example
 * ```ts
 * const result = await startApp(myApp, { port: 3000 });
 * if (isSuccess(result)) {
 *   await appWaitShutdown(result.app);
 * }
 * ```
 */
export async function startApp<
  P extends ObjectPropsOptions,
  S extends Record<string, any>,
  M extends Record<string, (...args: any[]) => any>,
>(
  app: AppDefinition<P, S, M> | AppInstance<P, S, M>,
  props: ExtractPropTypes<P>,
): Promise<ExecResult<{ app: AppInstance<P, S, M> }>> {
  const instance = isAppDefinition(app) ? createAppInstance(app) : app;

  const setupResult = await setupApp(instance, props);

  if (isSkip(setupResult)) {
    return setupResult;
  }

  const runResult = await runApp(instance);

  if (isSkip(runResult)) {
    await shutdownApp(instance);
    return runResult;
  }

  return {
    success: true,
    code: 'start_app',
    app: instance,
  };
}

/**
 * Run the setup phase of an app instance.
 * @group Lifecycle
 * @example
 * ```ts
 * const result = await setupApp(instance, { port: 3000 });
 * if (isSuccess(result)) {
 *   await runApp(instance);
 * }
 * ```
 */
export async function setupApp(
  instance: AppInstance,
  props: Data,
): Promise<ExecResult> {
  const mutexResolve = await mutexAcquire(instance, 'setup');

  if (instance.isSetupDone) {
    mutexResolve();
    return {
      skip: true,
      code: 'setup_app',
      reason: 'application already setup done',
    };
  }

  if (instance.isRunning) {
    mutexResolve();
    return {
      skip: true,
      code: 'setup_app',
      reason: 'application is running',
    };
  }

  if (instance.isStopping) {
    mutexResolve();
    return {
      skip: true,
      code: 'setup_app',
      reason: 'application is stopping',
    };
  }

  if (instance.isShuttingDown) {
    mutexResolve();
    return {
      skip: true,
      code: 'setup_app',
      reason: 'application is shutting down',
    };
  }

  const { setup } = instance.definition;

  if (isFunction(setup)) {
    try {
      const setupResult = await setup.call(instance.setupState, props);

      Object.assign(instance.setupState, setupResult);
    } catch (error) {
      mutexResolve();
      return {
        code: 'setup_app',
        skip: true,
        reason: 'setup function throw error',
        error: toError(error),
      };
    }
  }

  instance.props = props;
  instance.isSetupDone = true;
  mutexResolve();

  return {
    success: true,
    code: 'setup_app',
  };
}

/**
 * Run the entry phase of an app instance.
 * @group Lifecycle
 * @example
 * ```ts
 * await setupApp(instance, props);
 * await runApp(instance);
 * ```
 */
export async function runApp(instance: AppInstance): Promise<ExecResult> {
  const mutexResolve = await mutexAcquire(instance, 'run');

  if (!instance.isSetupDone) {
    mutexResolve();
    return {
      skip: true,
      code: 'execute_app',
      reason: 'application instance is not setup',
    };
  }

  if (instance.isRunning) {
    mutexResolve();
    return {
      skip: true,
      code: 'execute_app',
      reason: 'application is running',
    };
  }

  if (instance.isStopping) {
    mutexResolve();
    return {
      skip: true,
      code: 'execute_app',
      reason: 'application is stopping',
    };
  }

  if (instance.isShuttingDown) {
    mutexResolve();
    return {
      skip: true,
      code: 'execute_app',
      reason: 'application is shutting down',
    };
  }

  const { entry, name, logging } = instance.definition;

  if (logging) log.start(`Starting ${name}...`);

  instance.isRunning = true;

  if (isFunction(entry)) {
    try {
      await entry.call(instance.setupState, instance.props!);
    } catch (error) {
      instance.isRunning = false;
      mutexResolve();
      return {
        skip: true,
        code: 'execute_app',
        reason: 'entry function throw error',
        error: toError(error),
      };
    }
  }

  mutexResolve();

  if (logging) {
    log.success(`${name} started`);
  }

  return {
    success: true,
    code: 'execute_app',
  };
}

/**
 * Stop a running app instance and call its `stop` hook.
 * @group Lifecycle
 * @example
 * ```ts
 * process.on('SIGTERM', async () => {
 *   await stopApp(instance);
 *   await shutdownApp(instance);
 * });
 * ```
 */
export async function stopApp(instance: AppInstance): Promise<ExecResult> {
  const mutexResolve = await mutexAcquire(instance, 'stop');

  if (!instance.isRunning) {
    mutexResolve();
    return {
      skip: true,
      code: 'stop_app',
      reason: 'application is not running',
    };
  }

  if (instance.isStopping) {
    mutexResolve();
    return {
      skip: true,
      code: 'stop_app',
      reason: 'application is already stopping',
    };
  }

  if (instance.isShuttingDown) {
    mutexResolve();
    return {
      skip: true,
      code: 'stop_app',
      reason: 'application is shutting down',
    };
  }

  const { stop, name, logging } = instance.definition;

  if (logging) {
    log.start(`Stopping ${name}...`);
  }

  instance.isStopping = true;

  let stopErr: Error | undefined;

  if (isFunction(stop)) {
    try {
      await stop.call(instance.setupState, instance.props!);
    } catch (err) {
      stopErr = toError(err);
    }
  }

  instance.isRunning = false;
  instance.isStopping = false;
  mutexResolve();

  if (stopErr) {
    return {
      skip: true,
      code: 'stop_app',
      reason: 'stop function throw error',
      error: stopErr,
    };
  }

  if (logging) {
    log.success(`${name} stopped`);
  }

  return {
    success: true,
    code: 'stop_app',
  };
}

/**
 * Shut down an app instance, call its `shutdown` hook, and reset all state.
 * @group Lifecycle
 * @example
 * ```ts
 * await stopApp(instance);
 * await shutdownApp(instance);
 * // instance can be set up and started again after this
 * ```
 */
export async function shutdownApp(instance: AppInstance): Promise<ExecResult> {
  const mutexResolve = await mutexAcquire(instance, 'shutdown');

  if (instance.isShuttingDown) {
    mutexResolve();
    return {
      skip: true,
      code: 'shutdown_app',
      reason: 'application is shutting down',
    };
  }

  const { shutdown, name, logging } = instance.definition;

  if (logging) {
    log.start(`Shutdown ${name}...`);
  }

  let shutdownErr: Error | undefined;

  if (isFunction(shutdown)) {
    instance.isShuttingDown = true;

    try {
      await shutdown.call(instance.setupState, instance.props!);
    } catch (err) {
      shutdownErr = toError(err);
    }
  }

  instance.isRunning = false;
  instance.isSetupDone = false;
  instance.isStopping = false;
  instance.isShuttingDown = false;
  instance.props = null;
  instance.setupState = createSetupState(instance.definition);
  mutexResolve();
  emit(instance, 'shutdown');

  if (shutdownErr) {
    return {
      skip: true,
      code: 'shutdown_app',
      reason: 'shutdown function throw error',
      error: shutdownErr,
    };
  }

  return {
    success: true,
    code: 'shutdown_app',
  };
}

/**
 * Returns a promise that resolves when the app emits its shutdown event.
 * Resolves immediately if the app is not running.
 * @group Lifecycle
 * @example
 * ```ts
 * await startApp(myApp, props);
 * await appWaitShutdown(instance); // blocks until shutdown
 * ```
 */
export function appWaitShutdown(instance: AppInstance): Promise<void> {
  if (!instance.isRunning) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    once(instance, 'shutdown', resolve);
  });
}

function createSetupState(definition: AppDefinition): Data {
  const setupState: Data = {};

  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      setupState[key] = fn.bind(setupState);
    }
  }

  return setupState;
}

function mutexAcquire(
  instance: AppInstance,
  name: string,
): Promise<() => void> {
  let outerResolve!: (release: () => void) => void;

  const acquirePromise = new Promise<() => void>(res => {
    outerResolve = res;
  });

  instance.mutexQueue = instance.mutexQueue.then(
    () =>
      new Promise<void>(innerResolve => {
        instance.mutexName = name;
        outerResolve(() => {
          instance.mutexName = null;
          innerResolve();
        });
      }),
  );

  return acquirePromise;
}

function emitter(app: AppInstance): EventEmitter {
  let result = EVENT_LISTENER_MAP.get(app);
  if (!result) {
    result = new EventEmitter();
    EVENT_LISTENER_MAP.set(app, result);
  }

  return result;
}

function on(app: AppInstance, eventName: string, fn: AnyFunction) {
  emitter(app).on(eventName, fn);
}

function once(app: AppInstance, eventName: string, fn: AnyFunction) {
  emitter(app).once(eventName, fn);
}

function off(app: AppInstance, eventName: string, fn: AnyFunction) {
  emitter(app).off(eventName, fn);
}

function emit(app: AppInstance, eventName: string, ...args: any[]) {
  emitter(app).emit(eventName, ...args);
}
