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
 * Fast idle capability to run callback at next tick
 *
 * @example
 * fastIdle(() => {
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
