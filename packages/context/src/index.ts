import { type AnyFunction, assert } from '@andrew_l/toolkit';
import { createScope, getCurrentScope } from './scope';

export * from './hooks/createContext';
export * from './hooks/onScopeDispose';
export * from './hooks/provide';
export { getCurrentScope } from './scope';

/**
 * Creates a function within the injection context and returns its result. Providers/injections are only accessible within the callback function.
 * @param isolated Do not inject parent providers into this context (Default: `false`)
 *
 * @example
 * const main = withContext(() => {
 *     provide('user', { id: 1, name: 'Andrew' });
 *     doCoolStaff();
 * });
 *
 * const doCoolStaff = () => {
 *     const user = inject('user');
 *     console.log(user); // { id: 1, name: 'Andrew' }
 * };
 *
 * main();
 *
 * @group Main
 */
export function withContext<T extends AnyFunction>(fn: T, detached = false): T {
  return function (this: any, ...args: any[]) {
    const scope = createScope(detached);
    return scope.run(fn.bind(this, ...args));
  } as T;
}

/**
 * Runs a function within the injection context and returns its result. Providers/injections are only accessible inside the callback function.
 * @param isolated Do not inject parent providers into this context (Default: `false`)
 * @group Main
 */
export function runWithContext<T = any>(fn: () => T, isolated = false): T {
  return withContext(fn, isolated)();
}

/**
 * Binds the current context to the provided function. Useful for creating callbacks with the current context, such as `setTimeout` or `EventEmitter` handlers.
 * @example
 * const main = withContext(() => {
 *   provide("user", { id: 1, name: "Andrew" });
 *
 *   setInterval(bindContext(() => {
 *     const user = inject("user");
 *     console.log(user); // { id: 1, name: 'Andrew' }
 *   }));
 * });
 *
 * main();
 *
 * @group Main
 */
export function bindContext<T>(fn: () => T): () => T {
  const activeScope = getCurrentScope();

  assert.ok(
    activeScope,
    'bindContext() is called when there is no active scope to be associated with.',
  );

  return () => activeScope.run(fn);
}
