import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import { TimeBucket } from '../TimeBucket';

interface Options {
  sizeMs: number;
  capacity?: number;
  cachePointer?: WithCachePointer;
}

export const cacheBucket = /*#__PURE__*/ new WeakMap<
  // @ts-expect-error
  WithCachePointer,
  TimeBucket<string, any>
>();

/**
 * Wrap a function to cache results by arguments
 *
 * But with time and capacity limitation
 *
 * @example
 * const sum = withCacheBucket({ capacity: 1, sizeMs: 1000000 }, (a, b) => {
 *     console.log('calc?');
 *     return a + b;
 * });
 *
 * sum(1, 2); // calc?
 * sum(1, 2);
 * sum(1, 3)  // calc?
 * sum(1, 3)
 * sum(1, 2); // calc?
 *
 * @group Cache
 */
export function withCacheBucket<T extends AnyFunction>(
  { capacity, sizeMs, cachePointer }: Options,
  fn: T,
): WithCacheResult<T> {
  const pointer = cachePointer || fn;

  const getPointer = () => {
    return pointer;
  };

  const getBucket = () => {
    let fnCache = cacheBucket.get(pointer);

    if (!fnCache) {
      fnCache = new TimeBucket({ sizeMs, capacity });
      cacheBucket.set(pointer, fnCache);
    }

    return fnCache;
  };

  return createWithCache({
    fn,
    getBucket,
    getPointer,
  });
}
