import { delay } from './promise/delay';
import type { AnyFunction } from './types';

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
  shouldRetryBasedOnError: (error: unknown, attempt: number) => boolean;
  /**
   * Number of retries until the execution fails
   */
  maxRetriesNumber: number;

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

export function retryOnError<T extends AnyFunction>(
  {
    beforeRetryCallback,
    maxRetriesNumber,
    shouldRetryBasedOnError,
    delayFactor = 0,
    delayMaxMs = 1000,
    delayMinMs = 100,
  }: RetryOnErrorConfig,
  fn: T,
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let retryCount = maxRetriesNumber;
  let delayMs = 0;

  delayMinMs = Math.max(delayMinMs, 1);
  delayMaxMs = Math.max(delayMaxMs, 1);

  const run = async (...args: any[]): Promise<any> => {
    if (delayFactor >= 1 && delayMs > 0) {
      await delay(delayMs);
    }

    const currentAttempt = 1 + maxRetriesNumber - retryCount;

    try {
      const res = await fn(...args);
      return res;
    } catch (e) {
      if (retryCount > 1 && shouldRetryBasedOnError(e, currentAttempt)) {
        retryCount--;
        delayMs = Math.floor(
          Math.min(Math.max(delayMs, delayMinMs) * delayFactor, delayMaxMs),
        );

        if (beforeRetryCallback) {
          const newParams = await beforeRetryCallback(
            currentAttempt,
            retryCount === 0,
          );
          if (newParams) {
            return run(newParams);
          }
        }
        return run(...args);
      }

      throw e;
    }
  };

  return run;
}
