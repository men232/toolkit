import {
  type AnyFunction,
  type Awaitable,
  type Data,
  type ExecResult,
  type ExecSkipData,
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

import { withContext } from '@andrew_l/context';
import { APP_DEF, CONFIG } from './constants.ts';
import { extractOptionsArgs, isMainFile } from './utils/args.js';
import { filePathFromStack } from './utils/filePathFromStack.js';
import { createAppLogger } from './utils/log.ts';

export namespace AppDefinition {
  export type EntryContext<T extends Data = {}> = T & {
    log: Logger;
    app: AppInstance;
  };

  export type SetupContext<T extends Data = {}> = T & {
    log: Logger;
    app: AppInstance;
  };

  export type RuntimeContext<T extends Data = {}> = T & {
    log: Logger;
    app: AppInstance;
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
  RuntimeContext extends AppDefinition.RuntimeContext =
    AppDefinition.RuntimeContext<S & M>,
  EntryContext extends AppDefinition.EntryContext = AppDefinition.EntryContext<
    S & M
  >,
  SetupContext extends AppDefinition.SetupContext =
    AppDefinition.SetupContext<M>,
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

  export type SetupResult = ExecResult<
    { code: 'setup_app' },
    | { code: 'setup_app_error'; error: Error }
    | { code: 'setup_app_invalid_state'; state: State }
  >;
  export type RunResult = ExecResult<
    { code: 'execute_app' },
    | { code: 'execute_app_error'; error: Error }
    | { code: 'execute_app_invalid_state'; state: State }
  >;
  export type StopResult = ExecResult<
    { code: 'stop_app' },
    | { code: 'stop_app_error'; error: Error }
    | { code: 'stop_app_invalid_state'; state: State }
  >;
  export type ShutdownResult = ExecResult<
    { code: 'shutdown_app' },
    | { code: 'shutdown_app_error'; error: Error }
    | { code: 'shutdown_app_invalid_state'; state: State }
  >;
  export type StartResult<
    P extends ObjectPropsOptions = ObjectPropsOptions,
    S extends Record<string, any> = Data,
  > = ExecResult<
    { app: AppInstance<P, S> },
    ExecSkipData<SetupResult | RunResult>
  >;
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
  P extends ObjectPropsOptions = ObjectPropsOptions,
  S extends Record<string, any> = {},
  M extends Record<string, AnyFunction> = {},
>(definition: AppDefinition<P, S, M>): AppDefinition<P, S, M> {
  const result = {
    ...definition,
  };

  def(result, APP_DEF, true);

  // Wrap entry function with context
  if (definition.entry) {
    result.entry = withContext(definition.entry);
  }

  if (!('filePath' in result)) {
    result.filePath = filePathFromStack(captureStackTrace(defineApp));
  }

  if (isAppAutorun(result)) {
    import('./cli/index.js').then(m => {
      m.cli.runApp({
        cliName: 'app',
        scriptFile: result.filePath!,
        argv: extractOptionsArgs(process.argv.slice(1)),
      });
    });
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
  const instance: AppInstance<P, S, M> = {
    definition,
    props: null,
    setupState: null as any,
    eventBus: new SimpleEventEmitter(),
    mutexName: null,
    mutexQueue: Promise.resolve(),
    state: APP_INSTANCE_STATE.INIT,
    logger: createAppLogger(definition),
  };

  const setupState: AppDefinition.SetupContext = {
    log: instance.logger,
    app: instance,
  };

  const reservedKeys = Object.keys(setupState);

  if (definition.methods) {
    for (const [key, fn] of Object.entries(definition.methods)) {
      if (!reservedKeys.includes(key)) {
        (setupState as any)[key] = fn.bind(setupState);
      }
    }
  }

  instance.setupState = setupState;

  return instance;
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
export function startApp<
  P extends ObjectPropsOptions,
  S extends Record<string, any>,
>(
  app: AppDefinition<P, S> | AppInstance<P, S>,
  props: ExtractPropTypes<P>,
): Promise<AppInstance.StartResult<P, S>> {
  const instance = isAppDefinition(app) ? createAppInstance(app) : app;

  return setupApp(instance, props).then(setupResult => {
    if (isSkip(setupResult)) {
      return setupResult;
    }

    return runApp(instance).then(runResult => {
      if (isSkip(runResult)) {
        return shutdownApp(instance).then(() => runResult);
      }

      return {
        success: true,
        code: 'start_app',
        app: instance,
      };
    });
  });
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
export function setupApp(
  instance: AppInstance,
  props: Data,
): Promise<AppInstance.SetupResult> {
  return mutexAcquire(instance, 'setup').then(mutexResolve => {
    if (instance.state !== APP_INSTANCE_STATE.INIT) {
      mutexResolve();
      return {
        skip: true,
        code: 'setup_app_invalid_state',
        state: instance.state,
        reason: `application in ${instance.state} state`,
      };
    }

    setState(instance, APP_INSTANCE_STATE.IN_SETUP);

    const { setup } = instance.definition;

    let setupPromise = Promise.resolve();

    if (isFunction(setup)) {
      setupPromise = setupPromise
        .then(() => setup.call(instance.setupState, props))
        .then(
          setupResult => void Object.assign(instance.setupState, setupResult),
        );
    }

    return setupPromise
      .then((): AppInstance.SetupResult => {
        instance.props = props;
        setState(instance, APP_INSTANCE_STATE.SETUP);

        return {
          success: true,
          code: 'setup_app',
        };
      })
      .catch((error): AppInstance.SetupResult => {
        setState(instance, APP_INSTANCE_STATE.ERROR);
        return {
          skip: true,
          code: 'setup_app_error',
          reason: 'setup function throw error',
          error: toError(error),
        };
      })
      .finally(() => mutexResolve());
  });
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
export function runApp(instance: AppInstance): Promise<AppInstance.RunResult> {
  return mutexAcquire(instance, 'run').then(mutexResolve => {
    if (instance.state !== APP_INSTANCE_STATE.SETUP) {
      mutexResolve();
      return {
        skip: true,
        code: 'execute_app_invalid_state',
        state: instance.state,
        reason: `application in ${instance.state} state`,
      };
    }

    let { entry } = instance.definition;

    setState(instance, APP_INSTANCE_STATE.IN_RUN);
    instance.logger.info('Starting...');

    let entryPromise = Promise.resolve();

    if (isFunction(entry)) {
      entryPromise = entryPromise.then(() =>
        entry.call(instance.setupState, instance.props!),
      );
    }

    return entryPromise
      .then((): AppInstance.RunResult => {
        setState(instance, APP_INSTANCE_STATE.RUN);
        instance.logger.info('Started');

        return {
          success: true,
          code: 'execute_app',
        };
      })
      .catch((error): AppInstance.RunResult => {
        setState(instance, APP_INSTANCE_STATE.ERROR);
        return {
          skip: true,
          code: 'execute_app_error',
          reason: 'entry function throw error',
          error: toError(error),
        };
      })
      .finally(() => mutexResolve());
  });
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
export function stopApp(
  instance: AppInstance,
): Promise<AppInstance.StopResult> {
  return mutexAcquire(instance, 'stop').then(mutexResolve => {
    if (instance.state !== APP_INSTANCE_STATE.RUN) {
      mutexResolve();
      return {
        skip: true,
        code: 'stop_app_invalid_state',
        state: instance.state,
        reason: `application in ${instance.state} state`,
      };
    }

    const { stop } = instance.definition;

    setState(instance, APP_INSTANCE_STATE.IN_STOP);
    instance.logger.info('Stopping...');

    let stopPromise = Promise.resolve();

    if (isFunction(stop)) {
      stopPromise = stopPromise.then(() =>
        stop.call(instance.setupState, instance.props!),
      );
    }

    return stopPromise
      .then((): AppInstance.StopResult => {
        setState(instance, APP_INSTANCE_STATE.STOP);
        instance.logger.info('Stopped');

        return {
          success: true,
          code: 'stop_app',
        };
      })
      .catch((err): AppInstance.StopResult => {
        setState(instance, APP_INSTANCE_STATE.ERROR);

        return {
          skip: true,
          code: 'stop_app_error',
          reason: 'stop function throw error',
          error: toError(err),
        };
      })
      .finally(() => mutexResolve());
  });
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
export function shutdownApp(
  instance: AppInstance,
): Promise<AppInstance.ShutdownResult> {
  return stopApp(instance)
    .then(() => mutexAcquire(instance, 'shutdown'))
    .then(mutexResolve => {
      if (
        instance.state !== APP_INSTANCE_STATE.STOP &&
        instance.state !== APP_INSTANCE_STATE.SETUP &&
        instance.state !== APP_INSTANCE_STATE.ERROR
      ) {
        mutexResolve();
        return {
          skip: true,
          code: 'shutdown_app_invalid_state',
          state: instance.state,
          reason: `application in ${instance.state} state`,
        };
      }

      const { shutdown } = instance.definition;

      setState(instance, APP_INSTANCE_STATE.IN_SHUTDOWN);
      instance.logger.info('Shutdown...');

      let shutdownPromise = Promise.resolve();

      if (isFunction(shutdown)) {
        shutdownPromise = shutdownPromise.then(() =>
          shutdown.call(instance.setupState, instance.props!),
        );
      }

      return shutdownPromise
        .then((): AppInstance.ShutdownResult => {
          setState(instance, APP_INSTANCE_STATE.SHUTDOWN);

          return {
            success: true,
            code: 'shutdown_app',
          };
        })
        .catch((shutdownErr): AppInstance.ShutdownResult => {
          setState(instance, APP_INSTANCE_STATE.ERROR);
          return {
            skip: true,
            code: 'shutdown_app_error',
            reason: 'shutdown function throw error',
            error: toError(shutdownErr),
          };
        })
        .finally(() => {
          instance.props = null;
          instance.setupState = null as any;
          mutexResolve();
        });
    });
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

/**
 * Returns true when app should be automatically started
 * @group Utils
 */
export function isAppAutorun(definition: AppDefinition): boolean {
  return (
    !CONFIG.IS_VRUN && !!definition.filePath && isMainFile(definition.filePath)
  );
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
