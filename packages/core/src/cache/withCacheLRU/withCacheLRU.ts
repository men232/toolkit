import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import { LruCache } from '../LruCache';

interface Options {
  capacity: number;
  cachePointer?: WithCachePointer;
}

export const cacheLRU = /*#__PURE__*/ new WeakMap<
  // @ts-expect-error
  WithCachePointer,
  LruCache<string, any>
>();

/**
 * Wrap a function to cache results by arguments
 *
 * But with LRU
 *
 * @example
 * const sum = withCacheLRU({ capacity: 100 }, (a, b) => {
 *     console.log('calc?');
 *     return a + b;
 * });
 *
 * sum(1, 2); // calc?
 * sum(1, 2);
 */
export function withCacheLRU<T extends AnyFunction>(
  { capacity, cachePointer }: Options,
  fn: T,
): WithCacheResult<T> {
  const pointer = cachePointer || fn;

  const getPointer = () => {
    return pointer;
  };

  const getBucket = () => {
    let fnCache = cacheLRU.get(pointer);

    if (!fnCache) {
      fnCache = new LruCache(capacity);
      cacheLRU.set(pointer, fnCache);
    }

    return fnCache;
  };

  return createWithCache({
    fn,
    getBucket,
    getPointer,
  });
}
