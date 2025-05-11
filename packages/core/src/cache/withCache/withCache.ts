import { isFunction, noop } from '@/is';
import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import type { ArgToKeyOptions } from '../createWithCache/utils';

export interface WithCacheOptions extends Partial<ArgToKeyOptions> {
  /**
   * Custom cache pointer
   */
  cachePointer?: WithCachePointer;
}

export const cache = /*#__PURE__*/ new WeakMap<
  WithCachePointer,
  Map<string, any>
>();

/**
 * Wrap a function to cache results by arguments
 *
 * @example
 * const sum = withCache((a, b) => {
 *     console.log('calc?');
 *     return a + b;
 * });
 *
 * sum(1, 2); // calc?
 * sum(1, 2);
 * sum(1, 3)  // calc?
 *
 * @group Cache
 */
export function withCache<T extends AnyFunction>(fn: T): WithCacheResult<T>;
export function withCache<T extends AnyFunction>(
  options: WithCacheOptions,
  fn: T,
): WithCacheResult<T>;

export function withCache(...args: any[]): WithCacheResult<AnyFunction> {
  let options: WithCacheOptions = {};
  let fn: AnyFunction = noop;

  if (isFunction(args[0])) {
    fn = args[0];
  } else if (isFunction(args[1])) {
    options = args[0] || {};
    fn = args[1];
  }

  const pointer = options.cachePointer || fn;

  const getPointer = () => pointer;

  const getBucket = (pointer: any) => {
    let fnCache = cache.get(pointer);

    if (!fnCache) {
      fnCache = new Map();
      cache.set(pointer, fnCache);
    }

    return fnCache;
  };

  return createWithCache({
    fn,
    getBucket,
    getPointer,
    ...options,
  });
}
