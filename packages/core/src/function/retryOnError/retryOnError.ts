import { isNumber, noop } from '@/is';
import { clamp } from '@/num/clamp';
import { delay } from '@/promise/delay';
import type { AnyFunction } from '@/types';

var NOOP_SHOULD_RETRY_BASED_ON_ERROR = () => true;

export type RetryOnErrorConfig = {
  /**
   * The function to execute before retry attempt; Allows to update parameters for the main function by returning then in an array
   */
  beforeRetryCallback?: (
    attempt: number,
    lastAttempt: boolean,
  ) => Promise<unknown[] | void>;
  /**
   * Error validation function. If returns true, the main callback's considered ready to be executed again
   */
  shouldRetryBasedOnError?: (error: unknown, attempt: number) => boolean;

  /**
   * Number of attempts to execute a function
   */
  maxAttempts?: number;

  /**
   * Number of retries until the execution fails (initial + retries)
   * @deprecated use `maxAttempts`
   */
  maxRetriesNumber?: number;

  /**
   * Delay multiply factor
   */
  delayFactor?: number;

  /**
   * Delay min milliseconds
   */
  delayMinMs?: number;

  /**
   * Delay max milliseconds
   */
  delayMaxMs?: number;
};

/**
 * Wraps a function with retry logic.
 *
 * @example
 * const fn = await retryOnError({
 *   maxRetriesNumber: 10,
 *   delayFactor: 2,
 *   delayMinMs: 1000,
 *   delayMaxMs: 3000,
 *   shouldRetryBasedOnError(error, attemptNumber) {
 *     return error.code !== 'RECORD_EXISTS';
 *   }
 * }, async () => {
 *   await db.transactions.insert(doc);
 * });
 *
 * await fn();
 *
 * @group Utility Functions
 */
export function retryOnError<T extends AnyFunction>(
  {
    beforeRetryCallback = noop as AnyFunction,
    shouldRetryBasedOnError = NOOP_SHOULD_RETRY_BASED_ON_ERROR,
    maxAttempts,
    maxRetriesNumber = 1,
    delayFactor = 0,
    delayMaxMs = 1000,
    delayMinMs = 100,
  }: RetryOnErrorConfig,
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  delayMinMs = Math.max(delayMinMs, 1);
  delayMaxMs = Math.max(delayMaxMs, 1);

  return function (this: any, ...args) {
    var delayMs = 0;
    var currentAttempt = 0;
    var leftAttempts = isNumber(maxAttempts)
      ? maxAttempts
      : maxRetriesNumber + 1;

    var run = (): Promise<any> => {
      currentAttempt++;
      leftAttempts--;

      return Promise.resolve()
        .then(() => fn.apply(this, args))
        .catch(e => {
          if (leftAttempts < 1 || !shouldRetryBasedOnError(e, currentAttempt)) {
            return Promise.reject(e);
          }

          delayMs = clamp(delayMs * delayFactor, delayMinMs, delayMaxMs);

          return Promise.resolve()
            .then(() => beforeRetryCallback(currentAttempt, leftAttempts <= 1))
            .then(newParams => {
              if (Array.isArray(newParams)) {
                args = newParams as Parameters<T>;
              }

              return delay(delayMs).then(() => run());
            });
        });
    };

    return run();
  };
}
