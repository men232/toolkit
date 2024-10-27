import { isFunction } from '@/is';
import type { Fn } from '@/types';

const defaultWindow = (globalThis as any)?.window;

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
  if (defaultWindow?.requestIdleCallback) {
    defaultWindow?.requestIdleCallback(callback);
  } else if (defaultWindow?.requestAnimationFrame) {
    defaultWindow?.requestAnimationFrame(callback);
  } else if (isFunction(process?.nextTick)) {
    process.nextTick(callback);
  } else {
    setTimeout(callback, 0);
  }
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
  return new Promise<void>(resolve => fastIdle(resolve));
}
