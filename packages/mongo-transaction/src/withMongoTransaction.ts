import {
  type ClientSession,
  type ClientSessionOptions,
  MongoTransactionError,
} from 'mongodb';

import {
  type AnyFunction,
  type Awaitable,
  catchError,
  deepDefaults,
  isFunction,
  noop,
} from '@andrew_l/toolkit';
import { provideMongoSession } from './hooks/useMongoSession';
import { createTransactionScope } from './scope';
import {
  isMongoClientLike,
  isTransactionAborted,
  isTransactionCommittedEmpty,
} from './utils';

const DEF_SESSION_OPTIONS = Object.freeze({
  defaultTransactionOptions: {
    readPreference: 'primary',
    readConcern: { level: 'local' },
    writeConcern: { w: 'majority' },
  },
} as ClientSessionOptions);

export interface MongoClientLike {
  startSession(options: Record<string, any>): ClientSessionLike;
}

export interface ClientSessionLike {
  withTransaction(fn: AnyFunction): Promise<any>;
  endSession(): Promise<void>;
}

type ConnectionValue = MongoClientLike | (() => Awaitable<MongoClientLike>);

type Callback<T, K = any, Args extends Array<any> = any[]> = (
  this: K,
  session: ClientSession,
  ...args: Args
) => Awaitable<T>;

export interface WithMongoTransactionOptions<
  T,
  K = any,
  Args extends Array<any> = any[],
> {
  /**
   * Mongodb connection getter
   */
  connection: ConnectionValue;

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
   * Configures a timeoutMS expiry for the entire withTransactionCallback.
   *
   * @remarks
   * - The remaining timeout will not be applied to callback operations that do not use the ClientSession.
   * - Overriding timeoutMS for operations executed using the explicit session inside the provided callback will result in a client-side error.
   */
  timeoutMS?: number;

  /**
   * Transaction function that will be executed
   *
   * ⚠️ Possible several times!
   */
  fn: Callback<T, K, Args>;
}

type WithMongoTransactionWrapped<
  T,
  K = any,
  Args extends Array<any> = any[],
> = (this: K, ...args: Args) => Promise<T>;

/**
 * Runs a provided callback within a transaction, retrying either the commitTransaction operation or entire transaction as needed (and when the error permits) to better ensure that the transaction can complete successfully.
 *
 * Passes the session as the function's first argument or via `useMongoSession()` hook
 *
 * @example
 * const executeTransaction = withMongoTransaction({
 *   connection: () => mongoose.connection.getClient(),
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
 */
export function withMongoTransaction<
  T,
  K = any,
  Args extends Array<any> = any[],
>(
  options: WithMongoTransactionOptions<T, K, Args>,
): WithMongoTransactionWrapped<T, K, Args>;

/**
 * Runs a provided callback within a transaction, retrying either the commitTransaction operation or entire transaction as needed (and when the error permits) to better ensure that the transaction can complete successfully.
 *
 * Passes the session as the function's first argument or via `useMongoSession()` hook
 *
 * @example
 * const executeTransaction = withMongoTransaction(mongoose.connection.getClient(), async () => {
 *   const session = useMongoSession();
 *   const orders = mongoose.connection.collection('orders');
 *
 *   const { modifiedCount } = await orders.updateMany(
 *     { status: 'pending' },
 *     { $set: { status: 'confirmed' } },
 *     { session },
 *   );
 * });
 */
export function withMongoTransaction<
  T,
  K = any,
  Args extends Array<any> = any[],
>(
  connection: ConnectionValue,
  fn: Callback<T, K, Args>,
  options?: Omit<WithMongoTransactionOptions<any>, 'fn' | 'connection'>,
): WithMongoTransactionWrapped<T, K, Args>;

export function withMongoTransaction(
  connectionOrOptions: ConnectionValue | WithMongoTransactionOptions<any>,
  maybeFn?: Callback<any>,
  maybeOptions?: Partial<WithMongoTransactionOptions<any>>,
): WithMongoTransactionWrapped<any> {
  const {
    connection: connectionValue,
    fn,
    sessionOptions = {},
    timeoutMS,
  } = prepareOptions(connectionOrOptions, maybeFn, maybeOptions);

  return function (this: any, ...args: any[]) {
    return Promise.resolve()
      .then(() =>
        isFunction(connectionValue) ? connectionValue() : connectionValue,
      )
      .then(
        connection => connection.startSession(sessionOptions) as ClientSession,
      )
      .then(session => {
        const scope = createTransactionScope(function (
          this: any,
          ...args: any[]
        ) {
          provideMongoSession(session);
          return fn.call(this, session, ...args);
        });

        const timeoutAt = timeoutMS ? Date.now() + timeoutMS : 0;
        const timeoutError = new MongoTransactionError(
          'Transaction client-side timeout',
        );

        return catchError(() =>
          session.withTransaction(() => {
            if (timeoutAt && timeoutAt < Date.now()) {
              return Promise.reject(timeoutError);
            }

            return Promise.resolve()
              .then(() => scope.run.apply(this, args))
              .then(() => {
                if (scope.error) {
                  return Promise.reject(scope.error);
                }
              });
          }),
        ).then(({ 0: transactionError, 1: transactionResult }) => {
          const { result } = scope;

          return session
            .endSession()
            .catch(noop)
            .then(() => {
              if (
                transactionResult === undefined &&
                isTransactionCommittedEmpty(session.transaction)
              ) {
                // do nothing here
              } else if (
                isTransactionAborted(session.transaction) &&
                transactionResult === undefined &&
                transactionError === undefined
              ) {
                transactionError = new MongoTransactionError(
                  'Transaction is explicitly aborted',
                );
              }

              if (transactionError) {
                return scope
                  .rollback()
                  .then(() => Promise.reject(transactionError));
              }

              return scope.commit().then(() => result);
            });
        });
      });
  };
}

function prepareOptions(
  connectionOrOptions: ConnectionValue | WithMongoTransactionOptions<any>,
  maybeFn?: Callback<any>,
  maybeOptions?: Partial<WithMongoTransactionOptions<any>>,
): WithMongoTransactionOptions<any> {
  let options: WithMongoTransactionOptions<any>;

  if (
    isFunction(connectionOrOptions) ||
    isMongoClientLike(connectionOrOptions)
  ) {
    options = {
      ...(maybeOptions || {}),
      connection: connectionOrOptions,
      fn: maybeFn!,
    };
  } else {
    options = connectionOrOptions;
  }

  return deepDefaults(options, {
    sessionOptions: DEF_SESSION_OPTIONS,
  });
}
