import { type Fn, isEqual, noop } from '@andrew_l/toolkit';
import type { OnCommittedCallback } from '../scope';
import { injectTransactionScope } from './scope';

/**
 * Registers a callback to be executed upon transaction commitment, with support
 * for dependency-based updates.
 *
 * This function is used within a transaction scope to perform specific actions
 * when a transaction is committed. If dependencies are provided, the callback
 * is re-registered only if the dependencies have changed. Otherwise, the
 * callback is registered unconditionally.
 *
 * @param {OnCommittedCallback} callback - The function to be executed upon
 *   transaction commitment.
 * @param {readonly any[]} [dependencies=[]] - An optional array of dependencies
 *   to determine if the callback should be re-registered. If the dependencies
 *   differ from the previously registered ones, the callback is updated.
 * @returns {Fn} A cleanup function that, when called, replaces the callback
 *   with a no-op function.
 *
 * @example
 * // Basic usage without dependencies
 * onCommitted(() => {
 *   console.log('Transaction committed!');
 * });
 *
 * @example
 * // Using dependencies
 * count++;
 * onCommitted(() => {
 *   console.log(`Commit #${count}`);
 * }, [count]);
 *
 * @example
 * // Cleanup after use
 * const cleanup = onCommitted(() => {
 *   console.log('This will run only once!');
 * });
 * cleanup(); // Prevents the callback from running
 *
 * @group Hooks
 */
export function onCommitted(
  callback: OnCommittedCallback,
  dependencies: readonly any[] = [],
): Fn {
  const scope = injectTransactionScope();
  const { cursor, byCursor } = scope.hooks.committed;

  const config = byCursor[cursor];

  if (dependencies && config?.dependencies) {
    if (!isEqual(dependencies, config.dependencies)) {
      scope.log.debug('OnCommitted caused by dependencies', {
        prevDependencies: config.dependencies,
        newDependencies: dependencies,
        cursor,
      });

      byCursor[cursor] = { callback, dependencies };
    }
  } else {
    scope.log.debug('OnCommitted caused by missing dependencies', { cursor });
    byCursor[cursor] = { callback, dependencies };
  }

  scope.hooks.committed.cursor++;

  return () => {
    byCursor[cursor].callback = noop;
  };
}
