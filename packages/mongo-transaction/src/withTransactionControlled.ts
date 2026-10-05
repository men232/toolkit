import type { Logger } from '@andrew_l/toolkit';
import { createTransactionScope } from './scope';

export interface WithTransactionControlledOptions {
  /**
   * Receives effect and hook errors.
   *
   * @default logger('TransactionScope')
   */
  logger?: Logger;
}

export interface TransactionControlled<
  T,
  K = any,
  Args extends Array<any> = any[],
> {
  /**
   * Runs the function once. Never rejects because of `fn`: see `error` and `result`.
   */
  run: (this: K, ...args: Args) => Promise<void>;

  /**
   * Runs `onCommitted` hooks and clears the scope. Rejects with `error` if the run failed.
   */
  commit: () => Promise<void>;

  /**
   * Runs effect cleanups, then `onRollback` hooks, then clears the scope.
   *
   * Rejects with the cleanup error if a cleanup failed; the scope is kept, so calling
   * `rollback()` again retries only the failed cleanups and does not run the hooks again.
   */
  rollback: () => Promise<void>;

  /**
   * Result of the last run, `undefined` if it failed.
   */
  result: Readonly<T | undefined>;

  /**
   * Error of the last run.
   */
  error: Readonly<Error | undefined>;

  /**
   * `true` while `run()` is in progress.
   */
  active: boolean;
}

/**
 * Wraps a function and returns a `TransactionControlled` interface, allowing manual control
 * over transaction commit and rollback operations.
 *
 * This provides finer-grained control over the transaction lifecycle, enabling users to
 * explicitly commit or rollback a transaction based on custom logic. It's especially useful
 * in scenarios where transactional state or conditions need to be externally determined.
 *
 * @param fn - The target function to wrap with transaction handling.
 * @param [options.logger] - Receives effect and hook errors. Defaults to `logger('TransactionScope')`.
 *
 * @example
 * const t = withTransactionControlled(async (userId) => {
 *   await useTransactionEffect(async () => {
 *     await db.users.updateById(userId, { premium: true });
 *
 *     return () => db.users.updateById(userId, { premium: false })
 *   });
 *
 *   const user = await db.users.findById(userId);
 *
 *   return user;
 * });
 *
 * await t.run();
 *
 * // Remove premium when no subscriptions
 * if (t.result && t.result.activeSubscriptions > 0) {
 *   await t.commit();
 * } else {
 *   await t.rollback();
 * }
 *
 * @group Main
 */
export function withTransactionControlled<
  T,
  K = any,
  Args extends Array<any> = any[],
>(
  fn: (this: K, ...args: Args) => T,
  options?: WithTransactionControlledOptions,
): TransactionControlled<Awaited<T>, K, Args> {
  const scope = createTransactionScope(fn, options?.logger);

  const controlled = {
    run(...args: Args) {
      const self = this === controlled ? undefined : this;
      return scope.run.apply(self, args);
    },
    commit() {
      return scope.commit();
    },
    rollback() {
      return scope.rollback();
    },
    get active() {
      return scope.active;
    },
    get result() {
      return scope.result;
    },
    get error() {
      return scope.error;
    },
  };

  return controlled;
}
