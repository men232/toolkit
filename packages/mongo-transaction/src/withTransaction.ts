import { type RetryOnErrorConfig, noop, retryOnError } from '@andrew_l/toolkit';
import { createTransactionScope } from './scope';

export interface WithTransactionOptions extends Partial<RetryOnErrorConfig> {}

/**
 * Wraps a function with transaction context, enabling retry logic and transactional effects.
 *
 * The wrapped function may be executed multiple times (up to `maxRetriesNumber`) to ensure
 * all side effects complete successfully. If the retries are exhausted without success,
 * registered cleanup functions will be executed to undo any applied effects.
 *
 * This utility is useful for managing transactional side effects, such as
 * updates to external systems, and ensures proper cleanup in case of failure.
 *
 * Additionally, this enables hooks like `useTransactionEffect()`, which allows
 * defining effects with automatic rollback mechanisms.
 *
 * @param fn - The target function to wrap with transaction handling.
 * @param [options] - Configuration options for the transaction handling.
 * @param [options.beforeRetryCallback] - An optional callback to execute before each retry attempt.
 * @param [options.shouldRetryBasedOnError] - A predicate to determine if a retry should occur based on the thrown error. Defaults to always retry.
 * @param [options.maxRetriesNumber=5] - The maximum number of retries before failing the transaction. Defaults to 5.
 * @param [options.delayFactor=0] - A multiplier for the delay between retries. Default is 0 (no exponential backoff).
 * @param [options.delayMaxMs=1000] - The maximum delay between retries, in milliseconds. Defaults to 1000 ms.
 * @param [options.delayMinMs=100] - The minimum delay between retries, in milliseconds. Defaults to 100 ms.
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
    maxRetriesNumber = 5,
    delayFactor = 0,
    delayMaxMs = 1000,
    delayMinMs = 100,
  }: WithTransactionOptions = {},
): (this: K, ...args: Args) => Promise<Awaited<T>> {
  return async function (this: K, ...args: Args): Promise<Awaited<T>> {
    const scope = createTransactionScope(fn);

    await retryOnError(
      {
        beforeRetryCallback,
        shouldRetryBasedOnError,
        maxRetriesNumber,
        delayFactor,
        delayMaxMs,
        delayMinMs,
      },
      async () => {
        await scope.run.apply(this, args);

        // explicitly reject to trigger retry
        if (scope.error) {
          return Promise.reject(scope.error);
        }
      },
    )().catch(noop);

    const { error, result } = scope;

    if (error) {
      await scope.rollback();
      return Promise.reject(error) as any;
    } else {
      await scope.commit();
    }

    return result as Awaited<T>;
  };
}
