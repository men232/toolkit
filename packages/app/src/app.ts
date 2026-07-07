import {
  type AnyFunction,
  type Awaitable,
  type Data,
  type ExecResult,
  type Logger,
  SimpleEventEmitter,
  captureStackTrace,
  def,
  defer,
  isFunction,
  isSkip,
  toError,
} from '@andrew_l/toolkit';
import type { ExtractPropTypes, ObjectPropsOptions } from './utils/props.js';

import { CONFIG } from './config.js';
import { extractOptionsArgs } from './utils/args.js';
import { filePathFromStack } from './utils/filePathFromStack.js';
import { isMainFile } from './utils/isMainFile.js';
import { createAppLogger } from './utils/log.ts';

export namespace AppDefinition {
  export type EntryContext<T extends Data = Data> = T & {
    log: Logger;
  };

  export type SetupContext<T extends Data = Data> = T & {
    log: Logger;
  };

  export type RuntimeContext<T extends Data = Data> = T & {
    log: Logger;
  };
}

/**
 * Shape of an application — name, typed props, lifecycle hooks, and optional methods.
 * @group Types
 */
export interface AppDefinition<
  P extends ObjectPropsOptions = {},
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
  RuntimeContext extends
    AppDefinition.RuntimeContext = AppDefinition.RuntimeContext<S & M>,
  EntryContext extends AppDefinition.EntryContext = AppDefinition.EntryContext<
    S & M
  >,
  SetupContext extends
    AppDefinition.SetupContext = AppDefinition.SetupContext<M>,
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
   * Path to the file where this definition exports default
   * Usually you should not use this option, because it tracks automatically
   */
  filePath?: string | null;

  /**
   * Logger instance or constructor function
   */
  logger?: false | Logger | ((definition: AppDefinition) => Logger);

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
  entry?(
    this: EntryContext,
    props: ExtractPropTypes<P>,
    ...args: any[]
  ): Awaitable<any>;

  /**
   * Stop function that will be called each time when application stops
   */
  stop?(this: RuntimeContext, props: ExtractPropTypes<P>): Awaitable<void>;

  /**
   * Shutdown function that will be called before application/process graceful shutdown
   */
  shutdown?(this: RuntimeContext, props: ExtractPropTypes<P>): Awaitable<void>;
}

export const APP_INSTANCE_STATE = {
  INIT: 'init',
  IN_SETUP: 'in-setup',
  SETUP: 'setup',
  IN_STOP: 'in-stop',
  IN_RUN: 'in-run',
  RUN: 'run',
  STOP: 'stop',
  IN_SHUTDOWN: 'in-shutdown',
  SHUTDOWN: 'shutdown',
  ERROR: 'error',
} as const;

export namespace AppInstance {
  export type EventMap = {
    state: [newState: State, oldState: State];
    error: [err: Error];
  } & {
    [K in State as `state:${K}`]: [];
  };

  export type State =
    (typeof APP_INSTANCE_STATE)[keyof typeof APP_INSTANCE_STATE];
}

/**
 * Runtime state of a created app instance.
 * @group Types
 */
export interface AppInstance<
  P extends ObjectPropsOptions = {},
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
> {
  definition: AppDefinition<P, S, M>;
  props: ExtractPropTypes<P> | null;
  setupState: AppDefinition.SetupContext<Data>;
  eventBus: SimpleEventEmitter<AppInstance.EventMap>;
  /** @internal */
  mutexName: string | null;
  /** @internal */
  mutexQueue: Promise<void>;
  readonly state: AppInstance.State;
  logger: Logger;
}

const APP_DEF = Symbol('app-definition');

/**
 * Define an application with typed props and lifecycle hooks.
 *
 * When executed directly (`node app.ts`), the CLI is launched automatically.
 * @group Main
 * @example
 * ```ts
 * import { defineApp } from '@andrew_l/app';
 *
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
 * @group App Lifecycle
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
  const setupState = createSetupState(definition);

  return {
    definition,
    props: null,
    setupState,
    eventBus: new SimpleEventEmitter(),
    mutexName: null,
    mutexQueue: Promise.resolve(),
    state: APP_INSTANCE_STATE.INIT,
    logger: setupState.log,
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
 * @group App Lifecycle
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
>(
  app: AppDefinition<P, S> | AppInstance<P, S>,
  props: ExtractPropTypes<P>,
): Promise<ExecResult<{ app: AppInstance<P, S> }>> {
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
 * @group App Lifecycle
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

  if (instance.state !== APP_INSTANCE_STATE.INIT) {
    mutexResolve();
    return {
      skip: true,
      code: 'setup_app',
      reason: `application in ${instance.state} state`,
    };
  }

  setState(instance, APP_INSTANCE_STATE.IN_SETUP);

  const { setup } = instance.definition;

  if (isFunction(setup)) {
    try {
      const setupResult = await setup.call(instance.setupState, props);
      Object.assign(instance.setupState, setupResult);
    } catch (error) {
      setState(instance, APP_INSTANCE_STATE.ERROR);
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
  setState(instance, APP_INSTANCE_STATE.SETUP);
  mutexResolve();

  return {
    success: true,
    code: 'setup_app',
  };
}

/**
 * Run the entry phase of an app instance.
 * @group App Lifecycle
 * @example
 * ```ts
 * await setupApp(instance, props);
 * await runApp(instance);
 * ```
 */
export async function runApp(instance: AppInstance): Promise<ExecResult> {
  const mutexResolve = await mutexAcquire(instance, 'run');

  if (instance.state !== APP_INSTANCE_STATE.SETUP) {
    mutexResolve();
    return {
      skip: true,
      code: 'execute_app',
      reason: `application in ${instance.state} state`,
    };
  }

  const { entry } = instance.definition;

  setState(instance, APP_INSTANCE_STATE.IN_RUN);
  instance.logger.info('Starting...');

  if (isFunction(entry)) {
    try {
      await entry.call(instance.setupState, instance.props!);
    } catch (error) {
      setState(instance, APP_INSTANCE_STATE.ERROR);
      mutexResolve();
      return {
        skip: true,
        code: 'execute_app',
        reason: 'entry function throw error',
        error: toError(error),
      };
    }
  }

  setState(instance, APP_INSTANCE_STATE.RUN);
  mutexResolve();
  instance.logger.info('Started');

  return {
    success: true,
    code: 'execute_app',
  };
}

/**
 * Stop a running app instance and call its `stop` hook.
 * @group App Lifecycle
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

  if (instance.state !== APP_INSTANCE_STATE.RUN) {
    mutexResolve();
    return {
      skip: true,
      code: 'stop_app',
      reason: `application in ${instance.state} state`,
    };
  }

  const { stop } = instance.definition;

  setState(instance, APP_INSTANCE_STATE.IN_STOP);
  instance.logger.info('Stopping...');

  let stopErr: Error | undefined;

  if (isFunction(stop)) {
    try {
      await stop.call(instance.setupState, instance.props!);
    } catch (err) {
      setState(instance, APP_INSTANCE_STATE.ERROR);
      stopErr = toError(err);
    }
  }

  mutexResolve();

  if (stopErr) {
    return {
      skip: true,
      code: 'stop_app',
      reason: 'stop function throw error',
      error: stopErr,
    };
  }

  setState(instance, APP_INSTANCE_STATE.STOP);
  instance.logger.info('Stopped');

  return {
    success: true,
    code: 'stop_app',
  };
}

/**
 * Shut down an app instance, call its `shutdown` hook, and reset all state.
 * @group App Lifecycle
 * @example
 * ```ts
 * await stopApp(instance);
 * await shutdownApp(instance);
 * // instance can be set up and started again after this
 * ```
 */
export async function shutdownApp(instance: AppInstance): Promise<ExecResult> {
  await stopApp(instance);

  const mutexResolve = await mutexAcquire(instance, 'shutdown');

  if (
    instance.state !== APP_INSTANCE_STATE.STOP &&
    instance.state !== APP_INSTANCE_STATE.SETUP &&
    instance.state !== APP_INSTANCE_STATE.ERROR
  ) {
    mutexResolve();
    return {
      skip: true,
      code: 'shutdown_app',
      reason: `application in ${instance.state} state`,
    };
  }

  const { shutdown } = instance.definition;

  setState(instance, APP_INSTANCE_STATE.IN_SHUTDOWN);
  instance.logger.info('Shutdown...');

  let shutdownErr: Error | undefined;

  if (isFunction(shutdown)) {
    try {
      await shutdown.call(instance.setupState, instance.props!);
    } catch (err) {
      shutdownErr = toError(err);
    }
  }

  instance.props = null;
  instance.setupState = createSetupState(instance.definition);
  mutexResolve();

  if (shutdownErr) {
    setState(instance, APP_INSTANCE_STATE.ERROR);
    return {
      skip: true,
      code: 'shutdown_app',
      reason: 'shutdown function throw error',
      error: shutdownErr,
    };
  }

  setState(instance, APP_INSTANCE_STATE.SHUTDOWN);

  return {
    success: true,
    code: 'shutdown_app',
  };
}

/**
 * Returns a promise that resolves when the app emits its shutdown event.
 * Resolves immediately if the app is not running.
 * @group App Lifecycle
 * @example
 * ```ts
 * await startApp(myApp, props);
 * await appWaitShutdown(instance); // blocks until shutdown
 * ```
 */
export function appWaitShutdown(instance: AppInstance): Promise<void> {
  if (instance.state === APP_INSTANCE_STATE.SHUTDOWN) {
    return Promise.resolve();
  }

  const q = defer<void>();

  instance.eventBus.once('state:shutdown', q.resolve);
  instance.eventBus.once('error', q.reject);

  return q.promise.finally(() => {
    instance.eventBus.off('state:shutdown', q.resolve);
    instance.eventBus.off('error', q.reject);
  });
}

function createSetupState(
  definition: AppDefinition,
): AppDefinition.SetupContext {
  const setupState: AppDefinition.SetupContext = {
    log: createAppLogger(definition),
  };

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

function setState(app: AppInstance, newState: AppInstance.State) {
  const oldState = app.state;

  if (newState !== oldState) {
    // @ts-expect-error
    app.state = newState;
    app.eventBus.emit('state', newState, oldState);
    app.eventBus.emit(`state:${newState}`);
  }
}
