import { isFunction, isPromise } from '@/is';
import type { Awaitable } from '@/types';

type ToPromiseResult<T> = T extends () => Awaitable<infer X>
  ? X
  : T extends Promise<infer X>
    ? X
    : T;

/**
 * Wraps a value or a thunk in a `Promise`, always resolving on the next microtask.
 *
 * - If `value` is a function, it is called and its return value (sync or async) is awaited.
 *   Synchronous throws are converted to rejections.
 * - Otherwise, `value` is resolved as-is.
 *
 * @param value - A plain value or a zero-argument function returning `Awaitable<T>`.
 * @returns A `Promise` that resolves to the value or the function's result.
 *
 * @example
 * // Plain value
 * await toPromise(42); // → 42
 *
 * @example
 * // Sync function
 * await toPromise(() => computeResult()); // → result
 *
 * @example
 * // Async function
 * await toPromise(() => fetch('/api/data').then(r => r.json()));
 *
 * @group Promise
 */
export function toPromise<T>(value: T): Promise<ToPromiseResult<T>> {
  if (isFunction(value)) {
    return Promise.resolve().then(() => value());
  } else if (isPromise(value)) {
    return value as any;
  }

  return Promise.resolve().then(() => value) as any;
}
