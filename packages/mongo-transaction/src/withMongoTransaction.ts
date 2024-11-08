import type { ClientSession, ClientSessionOptions, MongoClient } from 'mongodb';

import {
  type Awaitable,
  catchError,
  isFunction,
  noop,
} from '@andrew_l/toolkit';
import { type TransactionContext, effectsRollback } from './context';
import { provideMongoSession } from './hooks/mongoSession';
import { injectTransactionContext } from './hooks/transactionContext';
import { withTransaction } from './withTransaction';

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

    let fnResult: any;
    let context: TransactionContext | undefined;

    const [transactionError, transactionResult] = await catchError(() =>
      session.withTransaction(
        withTransaction(async () => {
          provideMongoSession(session);
          context = injectTransactionContext();
          fnResult = await fn.call(this, session, ...args);
        }),
      ),
    );

    await session.endSession().catch(noop);

    // transaction aborted
    if (!transactionError && context && transactionResult === undefined) {
      await effectsRollback(context);
    }

    if (transactionError) {
      return Promise.reject(transactionError);
    }

    return fnResult;
  } as any;
}
