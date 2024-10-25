import { isFunction, isPromise } from '@/is';

/**
 * Throw an error if provided promise or callback has not been resolved in timeout
 *
 * @group Promise
 */
export function timeout<T = any>(
  ms: number,
  promiseOrCallback: Promise<T> | ((abortSignal: AbortSignal) => Promise<T>),
  timeoutError?: any,
): Promise<T> {
  const abortController = new AbortController();

  let taskResult: any;

  if (isFunction(promiseOrCallback)) {
    taskResult = promiseOrCallback(abortController.signal);
  } else if (isPromise(promiseOrCallback)) {
    taskResult = promiseOrCallback;
  }

  if (!isPromise(taskResult)) {
    return taskResult;
  }

  let timer: any;

  return Promise.race([
    taskResult,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        abortController.abort();
        reject(timeoutError || new Error('Timeout'));
      }, ms);
    }),
  ]).finally(() => {
    timer && clearTimeout(timer);
    timer = undefined;
  }) as Promise<T>;
}
