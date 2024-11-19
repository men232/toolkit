import { type Fn, isEqual, noop } from '@andrew_l/toolkit';
import type { OnRollbackCallback } from '../scope';
import { injectTransactionScope } from './scope';

/**
 * Registers a callback to be executed upon transaction rollback, with support
 * for dependency-based updates.
 *
 * This function is used within a transaction scope to perform specific actions
 * when a transaction is rolled back. If dependencies are provided, the callback
 * is re-registered only if the dependencies have changed. Otherwise, the
 * callback is registered unconditionally.
 *
 * @param {OnRollbackCallback} callback - The function to be executed upon
 *   transaction rollback.
 * @param {readonly any[]} [dependencies=[]] - An optional array of dependencies
 *   to determine if the callback should be re-registered. If the dependencies
 *   differ from the previously registered ones, the callback is updated.
 * @returns {Fn} A cleanup function to cancel event listener.
 *
 * @example
 * // Basic usage without dependencies
 * onRollback(() => {
 *   console.log('Transaction rolled back!');
 * });
 *
 * @example
 * // Using dependencies
 * count++;
 * onRollback(() => {
 *   console.log(`Rollback detected, flag is ${flag}`);
 * }, [count]);
 *
 * @example
 * // Cancel by request
 * const cancel = onRollback(() => {
 *   console.log('This will run only once on rollback!');
 * });
 *
 * if (orderReceived) {
 *   cancel(); // Prevents onRollback from running
 * }
 *
 * @group Hooks
 */
export function onRollback(
  callback: OnRollbackCallback,
  dependencies?: readonly any[],
): Fn {
  const scope = injectTransactionScope();
  const { cursor, byCursor } = scope.hooks.rollbacks;

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
