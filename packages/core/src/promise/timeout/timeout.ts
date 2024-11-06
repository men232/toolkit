import { isFunction, isPromise } from '@/is';
import type { Awaitable } from '@/types';

/**
 * Throw an error if provided promise or callback has not been resolved in timeout
 *
 * @example
 * // throw error if no response within 1 second
 * await timeout(
 *   1000,
 *   (signal) => {
 *     const account = await http.get('/api/users/me');
 *
 *     if (signal.aborted) return;
 *
 *     const statistics = await http.get('/api/users/me/statistics');
 *
 *     return { ...account, statistics }
 *   },
 *   new Error('Request account timeout')
 * );
 *
 * @group Promise
 */
export function timeout<T = any>(
  ms: number,
  promiseOrCallback: Promise<T> | ((abortSignal: AbortSignal) => Awaitable<T>),
  timeoutError: any = new Error('Timeout'),
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

  let timer: any;

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
