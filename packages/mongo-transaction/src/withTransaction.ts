import {
  type Logger,
  type RetryOnErrorConfig,
  noop,
  retryOnError,
} from '@andrew_l/toolkit';
import { createTransactionScope } from './scope';

export interface WithTransactionOptions extends Partial<RetryOnErrorConfig> {
  /**
   * Receives effect and hook errors.
   *
   * @default logger('TransactionScope')
   */
  logger?: Logger;
}

/**
 * Wraps a function with transaction context, enabling retry logic and transactional effects.
 *
 * The wrapped function may be executed multiple times (up to `maxAttempts`) to ensure
 * all side effects complete successfully. If the retries are exhausted without success,
 * registered cleanup functions will be executed to undo any applied effects.
 *
 * Enables `useTransactionEffect()`, `onCommitted()` and `onRollback()` inside `fn`.
 *
 * @param fn - The target function to wrap with transaction handling.
 * @param [options] - Configuration options for the transaction handling.
 * @param [options.beforeRetryCallback] - An optional callback to execute before each retry attempt.
 * @param [options.shouldRetryBasedOnError] - A predicate to determine if a retry should occur based on the thrown error. Defaults to always retry.
 * @param [options.maxAttempts] - Total number of attempts, initial run included. Takes precedence over `maxRetriesNumber`.
 * @param [options.maxRetriesNumber=5] - Deprecated, use `maxAttempts`. The maximum number of retries before failing the transaction.
 * @param [options.delayFactor=0] - A multiplier for the delay between retries. Default is 0 (no exponential backoff).
 * @param [options.delayMaxMs=1000] - The maximum delay between retries, in milliseconds. Defaults to 1000 ms.
 * @param [options.delayMinMs=100] - The minimum delay between retries, in milliseconds. Defaults to 100 ms.
 * @param [options.logger] - Receives effect and hook errors. Defaults to `logger('TransactionScope')`.
 *
 * @example
 * const confirmOrder = withTransaction(async (orderId) => {
 *   // Register Alert
 *   await useTransactionEffect(async () => {
 *     const alertId = await alertService.create({
 *       title: 'New Order: ' + orderId,
 *     });
 *
 *     return () => alertService.removeById(alertId); // Cleanup in case of failure
 *   });
 *
 *   // Update Statistics
 *   await useTransactionEffect(async () => {
 *     await statService.increment('orders_amount', 1);
 *
 *     return () => statService.decrement('orders_amount', 1); // Cleanup in case of failure
 *   });
 *
 *   // Simulate failure to trigger rollback
 *   throw new Error('Cancel transaction.');
 * });
 *
 * @group Main
 */
export function withTransaction<T, K = any, Args extends Array<any> = any[]>(
  fn: (this: K, ...args: Args) => T,
  {
    beforeRetryCallback,
    shouldRetryBasedOnError = () => true,
    maxAttempts,
    maxRetriesNumber = 5,
    delayFactor = 0,
    delayMaxMs = 1000,
    delayMinMs = 100,
    logger,
  }: WithTransactionOptions = {},
): (this: K, ...args: Args) => Promise<Awaited<T>> {
  return function (this: K, ...args: Args): Promise<Awaited<T>> {
    const scope = createTransactionScope(fn, logger);

    return retryOnError(
      {
        beforeRetryCallback,
        shouldRetryBasedOnError,
        maxAttempts,
        maxRetriesNumber,
        delayFactor,
        delayMaxMs,
        delayMinMs,
      },
      () => {
        return Promise.resolve()
          .then(() => scope.run.apply(this, args))
          .then(() => {
            // explicitly reject to trigger retry
            if (scope.error) {
              return Promise.reject(scope.error);
            }
          });
      },
    )()
      .catch(noop)
      .then(() => {
        const { error, result } = scope;

        if (error) {
          // A cleanup error is already logged and must not replace the function error.
          return scope
            .rollback()
            .catch(noop)
            .then(() => Promise.reject(error));
        }

        return scope.commit().then(() => result as Awaited<T>);
      });
  };
}
