import { type Fn, isEqual, noop } from '@andrew_l/toolkit';
import type { OnRollbackCallback } from '../scope';
import { injectTransactionScope } from './scope';

/**
 * Registers a callback that runs once after the final failure, after effect cleanups.
 * Not called between retries. A hook error is logged and does not affect the transaction result.
 *
 * @param callback Runs after the rollback.
 * @param dependencies When provided, the callback is replaced on retry only if they changed.
 * @returns Cancels the callback.
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
      scope.log.debug('OnRollback caused by dependencies', {
        prevDependencies: config.dependencies,
        newDependencies: dependencies,
        cursor,
      });

      byCursor[cursor] = { callback, dependencies };
    }
  } else {
    scope.log.debug('OnRollback caused by missing dependencies', { cursor });
    byCursor[cursor] = { callback, dependencies };
  }

  scope.hooks.rollbacks.cursor++;

  return () => {
    byCursor[cursor].callback = noop;
  };
}
