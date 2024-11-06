import {
  type AnyFunction,
  asyncForEach,
  defer,
  isFunction,
  isString,
  logger,
  noop,
} from '@andrew_l/toolkit';

type HandlerError = (err: Error) => void;
type Handler<returnType = unknown> = () => Promise<returnType> | returnType;
type CancelCallback = () => void;

const log = logger('Graceful Shutdown');

const HANDLED_EVENTS = Object.freeze(['SIGINT', 'SIGTERM', 'SIGQUIT'] as const);

const DEPENDENCY_TREE = new Map<string, Set<string>>();
const DEPENDENCY_MAP = new WeakMap<AnyFunction, string[]>();
const HANDLERS_MAP = new Map<string, AnyFunction[]>();
const SHUTDOWN_ERROR_HANDLERS: HandlerError[] = [];

let shuttingDown = false;

/**
 * Gracefully terminate application's modules on shutdown.
 * @param handler - Async or sync function which handles shutdown.
 */
export function onShutdown(handler: Handler): CancelCallback;

/**
 * Gracefully terminate application's modules on shutdown.
 * @param name - Name of the handler.
 * @param handler - Async or sync function which handles shutdown.
 */
export function onShutdown(name: string, handler: Handler): CancelCallback;

/**
 * Gracefully terminate application's modules on shutdown.
 * @param dependencies - Which handlers should be processed first.
 * @param handler - Async or sync function which handles shutdown.
 */
export function onShutdown(
  dependencies: string[],
  handler: Handler,
): CancelCallback;

/**
 * Gracefully terminate application's modules on shutdown.
 * @param name - Name of the handler.
 * @param dependencies - Which handlers should be processed first.
 * @param handler - Async or sync function which handles shutdown.
 *
 * @example
 * // This will called after http server close
 * onShutdown('mongoose', ['http-server'], async () => {
 *   console.info('Graceful: mongodb connection.');
 *   await mongoose.disconnect();
 * });
 *
 * onShutdown('http-server', async () => {
 *   console.info('Graceful: http server.');
 *   await httpServer.close();
 * });
 *
 * @group Main
 */
export function onShutdown(
  name: string,
  dependencies: string[],
  handler: Handler,
): CancelCallback;

export function onShutdown(...args: any[]): CancelCallback {
  const [_name, _dependencies, _handler] = args;

  const handler = isFunction(_name)
    ? _name
    : isFunction(_dependencies)
      ? _dependencies
      : _handler;

  const dependencies = Array.isArray(_name)
    ? _name
    : Array.isArray(_dependencies)
      ? _dependencies
      : [];

  const name = isString(_name) ? _name : Math.random().toString(36);

  if (shuttingDown) {
    log.warn(
      'Warn! Attempt to register handler while processing terminating: %s',
      name,
    );

    return noop;
  }

  if (dependencies.reduce((acc, dep) => acc || testForCycles(dep), false)) {
    throw new Error(
      `Adding shutdown handler "${name}" will create a dependency loop: aborting`,
    );
  }

  log.debug('Register handler: %s', name);

  DEPENDENCY_TREE.set(
    name,
    new Set([...(DEPENDENCY_TREE.get(name) || []), ...dependencies]),
  );

  DEPENDENCY_MAP.set(handler, dependencies);

  if (!HANDLERS_MAP.has(name)) {
    HANDLERS_MAP.set(name, []);
  }

  HANDLERS_MAP.get(name)!.push(handler);

  return () => {
    const handlersList = (HANDLERS_MAP.get(name) ?? []).filter(
      v => v !== handler,
    );

    if (!handlersList.length) {
      HANDLERS_MAP.delete(name);
    }

    const renewDependencies = new Set(
      handlersList
        .map(v => DEPENDENCY_MAP.get(v))
        .flat()
        .filter(isString),
    );

    if (renewDependencies.size) {
      DEPENDENCY_TREE.set(name, renewDependencies);
    } else {
      DEPENDENCY_TREE.delete(name);
    }

    DEPENDENCY_MAP.delete(handler);
  };
}

/**
 * Optional export to handle shutdown errors.
 */
export function onShutdownError(callback: HandlerError): CancelCallback {
  SHUTDOWN_ERROR_HANDLERS.push(callback);

  return () => {
    const idx = SHUTDOWN_ERROR_HANDLERS.indexOf(callback);
    if (idx > -1) {
      SHUTDOWN_ERROR_HANDLERS.splice(idx, 1);
    }
  };
}

export function processGraceful(signal: NodeJS.Signals = 'SIGTERM') {
  log.warn('Force with signal: %s', signal);
  process.emit('SIGTERM', signal);
}

async function shutdown(name: string, promisesMap: Map<string, Promise<any>>) {
  if (promisesMap.has(name)) {
    return promisesMap.get(name);
  }

  const q = defer<void>();

  promisesMap.set(name, q.promise);

  let lastError: unknown;

  try {
    const dependencies = DEPENDENCY_TREE.get(name);

    // Wait for all dependencies to shut down.
    if (dependencies) {
      await Promise.all(
        Array.from(dependencies).map(dep =>
          shutdown(dep, promisesMap).catch(err => (lastError = err)),
        ),
      );
    }

    // Shutdown this item.
    const allHandlers = HANDLERS_MAP.get(name);

    if (allHandlers?.length) {
      const timeoutInterval = setInterval(() => {
        log.warn('Long shutdown %s', name);
      }, 3000);

      await asyncForEach(
        allHandlers,
        async fn => {
          try {
            await fn();
          } catch (err) {
            lastError = err;
          }
        },
        { concurrency: 10 },
      );

      clearTimeout(timeoutInterval);
    }
  } catch (err) {
    lastError = err;
  }

  if (lastError) {
    q.reject(lastError);
  } else {
    q.resolve();
  }

  return q.promise;
}

for (const eventName of HANDLED_EVENTS) {
  process.removeAllListeners(eventName).addListener(eventName, () => {
    log.debug('Received signal: %s', eventName);
    onShutdownEvent();
  });
}

function onShutdownEvent() {
  if (shuttingDown) return;
  shuttingDown = true;

  // Get all unreferenced nodes.
  const unreferencedNames = getAllUnreferencedNames();

  const visited = new Map();
  Promise.all(unreferencedNames.map(name => shutdown(name, visited)))
    .then(() => exit(0))
    .catch(e => {
      Promise.all(SHUTDOWN_ERROR_HANDLERS.map(f => f(e)))
        .then(() => exit(42759))
        .catch(() => exit(42758));
    });
}

function testForCycles(name: string, visitedSet = new Set()): boolean {
  // Return true if the cycle is found.
  if (visitedSet.has(name)) return true;

  visitedSet.add(name);

  // If any of the cycles found in dependencies, return true.
  const dependencies = DEPENDENCY_TREE.get(name);

  if (!dependencies) return false;

  for (const dependencyName of dependencies.values()) {
    if (testForCycles(dependencyName, visitedSet)) return true;
  }

  return false;
}

function getAllUnreferencedNames(): string[] {
  const result = new Set(Array.from(DEPENDENCY_TREE.keys()));

  for (const dependencies of DEPENDENCY_TREE.values()) {
    for (const dependencyName of dependencies.values()) {
      result.delete(dependencyName);
    }
  }

  return Array.from(result);
}

function exit(code?: number): void {
  log.info('Shutdown with code: %d', code ?? 0);
  process.exit(code);
}
