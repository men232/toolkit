import { AppError } from '@/errors/AppError';
import { isFunction, isPromise } from '@/is';
import type { Awaitable } from '@/types';

/**
 * Throws an error if the provided promise or callback is not resolved within the specified timeout period.
 *
 * This function can be used to ensure that an asynchronous operation does not take too long to complete.
 * If the operation exceeds the specified time limit, the provided `timeoutError` is thrown.
 *
 * @example
 * // Example usage: Throw an error if no response is received within 1 second
 * await timeout(
 *   1000, // Timeout duration in milliseconds
 *   (signal) => {
 *     const account = await http.get('/api/users/me');
 *
 *     if (signal.aborted) return; // If the timeout occurs, abort the operation
 *
 *     const statistics = await http.get('/api/users/me/statistics');
 *
 *     return { ...account, statistics };
 *   },
 *   new Error('Request account timeout') // Custom error to throw on timeout
 * );
 *
 * @param ms - The maximum time (in milliseconds) to wait for the promise or callback to resolve.
 * @param promiseOrCallback - The asynchronous operation to execute. This can either be:
 *   - A `Promise` that will be awaited until completion, or
 *   - A function that takes an `AbortSignal` and returns a `Promise` or a value.
 * @param timeoutError - The error that will be thrown if the timeout is reached before the promise or callback resolves.
 *   (Defaults to `AppError(408)` if not provided).
 * @returns A `Promise` that resolves with the result of the provided `promiseOrCallback`, or rejects with the `timeoutError` if the timeout occurs.
 *
 * @throws {Error} - Throws the `timeoutError` if the operation exceeds the specified timeout.
 *
 * @group Promise
 */
export function timeout<T = any>(
  ms: number,
  promiseOrCallback: Promise<T> | ((abortSignal: AbortSignal) => Awaitable<T>),
  timeoutError: any = new AppError(408),
): Promise<T> {
  const abortController = new AbortController();

  let taskResult: any;

  if (isFunction(promiseOrCallback)) {
    taskResult = promiseOrCallback(abortController.signal);
  } else if (isPromise(promiseOrCallback)) {
    taskResult = promiseOrCallback;
  } else {
    throw new TypeError(
      'Expected promise or callback as second argument, received: ' +
        String(promiseOrCallback),
    );
  }

  if (!isPromise(taskResult)) {
    return Promise.resolve(taskResult);
  }

  let timer: ReturnType<typeof setTimeout> | undefined;

  return Promise.race([
    taskResult,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        abortController.abort();
        reject(timeoutError);
      }, ms);
    }),
  ]).finally(() => {
    timer && clearTimeout(timer);
    timer = undefined;
  }) as Promise<T>;
}
