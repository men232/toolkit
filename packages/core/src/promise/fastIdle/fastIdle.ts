import { isFunction } from '@/is';
import type { AnyFunction, Fn } from '@/types';

const defaultWindow = (globalThis as any)?.window;

const idle: (fn: AnyFunction) => void = (() => {
  if (defaultWindow?.requestIdleCallback) {
    return defaultWindow.requestIdleCallback;
  } else if (defaultWindow?.requestAnimationFrame) {
    return defaultWindow.requestAnimationFrame;
  } else if (isFunction(process?.nextTick)) {
    return process.nextTick;
  } else {
    return fn => setTimeout(fn, 0);
  }
})();

/**
 * Executes the provided callback as soon as the event loop is idle.
 * This function allows you to run tasks at the earliest available opportunity
 * without blocking the main execution flow, making it ideal for tasks that can
 * be deferred until the browser is idle or the process is idle.
 *
 * It uses `requestIdleCallback` if available, otherwise it falls back to
 * `requestAnimationFrame`, `process.nextTick`, or `setTimeout` depending on the environment.
 *
 * @example
 * fastIdle(() => {
 *   console.log('1');
 * });
 *
 * console.log('2');
 *
 * // Output:
 * // 2
 * // 1
 *
 * @param callback - The callback function to be executed when the event loop is idle.
 *
 * @group Promise
 */
export function fastIdle(callback: Fn) {
  return idle(callback);
}

/**
 * Same as `fastIdle` but promisified
 *
 * @example
 * fastIdlePromise().then(() => {
 *   console.log('1');
 * });
 *
 * console.log('2');
 *
 * // 2
 * // 1
 *
 * @group Promise
 */
export function fastIdlePromise() {
  return new Promise<void>(resolve => idle(resolve));
}
