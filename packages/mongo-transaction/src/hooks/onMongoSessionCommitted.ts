import {
  type AnyFunction,
  type Awaitable,
  defer,
  isPromise,
} from '@andrew_l/toolkit';
import type { ClientSession } from 'mongodb';
import { isTransactionCommitted } from '../utils';
import { injectMongoSession } from './useMongoSession';

export type OnMongoSessionCommittedResult<T> = {
  /**
   * Resolves with `T` after commit, with `undefined` if the transaction did not commit.
   * Rejects only if `fn` throws.
   */
  promise: Promise<T | undefined>;

  /**
   * Removes the listener. `promise` never settles afterwards.
   */
  cancel: () => void;
};

/**
 * Executes the provided function when the session ends with a committed transaction.
 * Not called on rollback or abort.
 *
 * ⚠️ Registers a listener per call, so a retried callback runs it once per attempt.
 * Inside `withMongoTransaction` prefer `onCommitted()`.
 *
 * @example
 * const { promise } = onMongoSessionCommitted(async () => {
 *   console.info('Transaction committed successfully!');
 *   return Math.random(); // Random value generated after commit
 * });
 *
 * promise.then(result => {
 *   if (result !== undefined) {
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
    if (!isTransactionCommitted(session.transaction)) {
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
