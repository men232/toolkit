import {
  type AnyFunction,
  type Awaitable,
  defer,
  isPromise,
} from '@andrew_l/toolkit';
import type { ClientSession } from 'mongodb';
import { injectMongoSession } from './useMongoSession';

export type OnMongoSessionCommittedResult<T> = {
  /**
   * Executes the provided function upon transaction commit.
   *
   * Returns `T` if the transaction is committed and the function completes successfully.
   *
   * Returns `undefined` if the transaction is explicitly aborted or ends without committing.
   *
   * Rejects if the function throws an error.
   */
  promise: Promise<T | undefined>;

  cancel: () => void;
};

/**
 * Executes the provided function upon transaction commit.
 *
 * Returns `T` if the transaction is committed and the function completes successfully.
 *
 * Returns `false` if the transaction ends without committing.
 *
 * Rejects if the function throws an error.
 *
 * @example
 * const { promise } = onTransactionCommitted(async () => {
 *   console.info('Transaction committed successfully!');
 *   return Math.random(); // Random value generated after commit
 * });
 *
 * promise.then(result => {
 *   if (result !== false) {
 *     console.info('Handler result:', result); // e.g., Handler result: 0.07576196837476501
 *   }
 * });
 *
 * @group Hooks
 */
export function onMongoSessionCommitted<T>(
  fn: () => Awaitable<T>,
): OnMongoSessionCommittedResult<T>;

export function onMongoSessionCommitted<T>(
  session: ClientSession,
  fn: () => Awaitable<T>,
): OnMongoSessionCommittedResult<T>;

export function onMongoSessionCommitted(
  ...args: any[]
): OnMongoSessionCommittedResult<unknown> {
  let session: ClientSession;
  let fn: AnyFunction;

  if (args.length === 2) {
    [session, fn] = args;
  } else {
    session = injectMongoSession();
    fn = args[0];
  }

  const q = defer<undefined | unknown>();

  const onEnded = () => {
    if (!session.transaction.isCommitted) {
      return q.resolve(undefined);
    }

    try {
      const result = fn();

      if (isPromise(result)) {
        result.then(r => q.resolve(r)).catch(q.reject);
      } else {
        q.resolve(result);
      }
    } catch (err) {
      q.reject(err);
    }
  };

  session.once('ended', onEnded);

  const cancel = () => {
    session.off('ended', onEnded);
  };

  return {
    promise: q.promise,
    cancel,
  };
}
