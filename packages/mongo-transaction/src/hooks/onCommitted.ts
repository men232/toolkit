import { type Fn, isEqual, noop } from '@andrew_l/toolkit';
import type { OnCommittedCallback } from '../scope';
import { injectTransactionScope } from './scope';

/**
 * Registers a callback that runs once after a successful commit, regardless of retries.
 * A hook error is logged and does not affect the transaction result.
 *
 * @param callback Runs after the commit.
 * @param dependencies When provided, the callback is replaced on retry only if they changed.
 * @returns Cancels the callback.
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
 * //  Cancel by request
 * const cancel = onCommitted(() => {
 *   console.log('This will run only once!');
 * });
 *
 * if (orderReceived) {
 *   cancel(); // Prevents onCommitted from running
 * }
 *
 * @group Hooks
 */
export function onCommitted(
  callback: OnCommittedCallback,
  dependencies?: readonly any[],
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
