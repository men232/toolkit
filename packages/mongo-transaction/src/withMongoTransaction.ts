import type { ClientSession, ClientSessionOptions, MongoClient } from 'mongodb';

import {
  type Awaitable,
  catchError,
  isFunction,
  noop,
} from '@andrew_l/toolkit';
import { provideMongoSession } from './hooks/useMongoSession';
import { createTransactionScope } from './scope';

export interface WithMongoTransactionOptions<
  T,
  K = any,
  Args extends Array<any> = any[],
> {
  /**
   * Mongodb connection getter
   */
  connection: MongoClient | (() => Awaitable<MongoClient>);

  /**
   * Transaction session options
   *
   * @default: {
   *   defaultTransactionOptions: {
   *     readPreference: 'primary',
   *     readConcern: { level: 'local' },
   *     writeConcern: { w: 'majority' },
   *   }
   * }
   */
  sessionOptions?: ClientSessionOptions;

  /**
   * Transaction function that will be executed
   *
   * ⚠️ Possible several times!
   */
  fn: (this: K, session: ClientSession, ...args: Args) => Promise<T>;
}

/**
 * Runs a provided callback within a transaction, retrying either the commitTransaction operation or entire transaction as needed (and when the error permits) to better ensure that the transaction can complete successfully.
 *
 * Passes the session as the function's first argument or via `useMongoSession()` hook
 *
 * @example
 * const executeTransaction = withMongoTransaction({
 *   connection: () => mongoose.connection,
 *   async fn() {
 *     const session = useMongoSession();
 *     const orders = mongoose.connection.collection('orders');
 *
 *     const { modifiedCount } = await orders.updateMany(
 *       { status: 'pending' },
 *       { $set: { status: 'confirmed' } },
 *       { session },
 *     );
 *   },
 * });

 *
 * @group Main
 *
 */
export function withMongoTransaction<
  T,
  K = any,
  Args extends Array<any> = any[],
>({
  connection: connectionValue,
  fn,
  sessionOptions = {},
}: WithMongoTransactionOptions<T, K, Args>): (...args: Args) => Promise<T> {
  return async function (this: K, ...args: Args) {
    const connection = isFunction(connectionValue)
      ? await connectionValue()
      : connectionValue;

    const session = await connection.startSession({
      ...sessionOptions,
      defaultTransactionOptions: {
        readPreference: 'primary',
        readConcern: { level: 'local' },
        writeConcern: { w: 'majority' },
        ...(sessionOptions.defaultTransactionOptions || {}),
      },
    });

    const scope = createTransactionScope(function (this: K, ...args: Args) {
      provideMongoSession(session);
      return fn.call(this, session, ...args);
    });

    let [transactionError, transactionResult] = await catchError(() =>
      session.withTransaction(async () => {
        await scope.run.apply(this, args);

        if (scope.error) {
          return Promise.reject(scope.error);
        }
      }),
    );

    await session.endSession().catch(noop);

    if (transactionResult === undefined && !transactionError) {
      transactionError = new Error('Transaction is explicitly aborted');
    }

    if (transactionError) {
      await scope.rollback();
      return Promise.reject(transactionError);
    }

    await scope.commit();

    return scope.result;
  } as any;
}
