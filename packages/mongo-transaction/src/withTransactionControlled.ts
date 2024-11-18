import { createTransactionScope } from './scope';

export interface TransactionControlled<
  T,
  K = any,
  Args extends Array<any> = any[],
> {
  run: (this: K, ...args: Args) => Promise<void>;

  commit: () => Promise<void>;

  rollback: () => Promise<void>;

  result: Readonly<T | undefined>;

  error: Readonly<Error | undefined>;

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
 * if (t.result.activeSubscriptions > 0) {
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
>(fn: (this: K, ...args: Args) => T): TransactionControlled<T, K, Args> {
  const scope = createTransactionScope(fn);

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
