import { noop } from '@/is';
import { delay } from '../delay';
import { createTimeoutError } from '../timeout/createTimeoutError';

interface WithTimeoutOptions {
  timeoutMs: number;
  timeoutError?: unknown;
  signal?: AbortSignal;
}

/**
 * Executes an async function and enforces a timeout.
 *
 * If the promise does not resolve within the specified time,
 * the timeout will trigger and the returned promise will be rejected.
 *
 * You can pass an `AbortSignal` to cancel the timeout. Aborting the signal lifts the
 * time limit: the timeout stops counting and `run`'s promise is awaited without a
 * deadline. It does not reject the returned promise or abort `run` itself — pass the
 * same signal into `run` if you also want to cancel the underlying work.
 *
 * @template T
 * @param run - A function that returns a promise to be executed.
 * @param opts - The options object.
 * @param opts.timeoutMs - The timeout duration in milliseconds.
 * @param opts.timeoutError - The rejection reason used when the timeout is reached.
 *   Defaults to an `AppError('The operation was timed out', 408)`.
 * @param opts.signal - An optional AbortSignal to cancel the timeout. When aborted, the time limit is lifted.
 * @returns A promise that resolves with the result of the `run` function or rejects if the timeout is reached.
 *
 * @example
 * async function fetchData() {
 *   const response = await fetch('https://example.com/data');
 *   return response.json();
 * }
 *
 * try {
 *   const data = await withTimeout(fetchData, { timeoutMs: 1000 });
 *   console.log(data); // Logs the fetched data if `fetchData` is resolved within 1 second.
 * } catch (error) {
 *   console.error(error); // Logs an AppError 408 if `fetchData` is not resolved within 1 second.
 * }
 *
 * @example
 * // Reject with your own error instead of the default AppError.
 * await withTimeout(fetchData, {
 *   timeoutMs: 1000,
 *   timeoutError: new Error('data source is too slow'),
 * });
 *
 * @example
 * // Lift the time limit when the user opts to keep waiting.
 * const controller = new AbortController();
 * keepWaitingButton.onclick = () => controller.abort();
 *
 * const data = await withTimeout(fetchData, {
 *   timeoutMs: 1000,
 *   signal: controller.signal,
 * });
 *
 * @group Promise
 */
export async function withTimeout<T>(
  run: () => Promise<T>,
  opts: WithTimeoutOptions,
): Promise<T> {
  return Promise.race([
    run(),
    delay(opts.timeoutMs, opts).then(() => {
      if (opts.signal?.aborted) return new Promise<never>(noop);

      return Promise.reject(opts.timeoutError || createTimeoutError());
    }),
  ]);
}
