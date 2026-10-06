import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import type { ArgToKeyOptions } from '../createWithCache/utils';
import { LruCache } from '../LruCache';

export interface WithCacheLruOptions extends Partial<ArgToKeyOptions> {
  capacity: number;
  cachePointer?: WithCachePointer;
}

export const cacheLRU = /*#__PURE__*/ new WeakMap<
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
 *
 * @replaces `map.delete(key); map.set(key, value)` to bump recency plus `map.delete(map.keys().next().value)` to evict,
 * around a memo — a bounded memo in one call. Same keying as `withCache`: objects by reference unless
 * `objectStrategy: 'json'`, rejections are not cached, and promise-returning functions must be declared `async`.
 * @detect `\.get\(\s*\w+\s*\)[\s\S]{0,120}?\.delete\(\s*\w+\s*\)\s*;?\s*[\w.]+\.set\(\s*\w+\s*,`
 * @detect `[\w.]+\.delete\(\s*[\w.]+\.keys\(\)\.next\(\)\.value`
 *
 * @group Cache
 */
export function withCacheLRU<T extends AnyFunction>(
  { capacity, cachePointer, ...options }: WithCacheLruOptions,
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
    ...options,
  });
}
