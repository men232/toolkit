import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import type { ArgToKeyOptions } from '../createWithCache/utils';
import { FixedMap } from '../FixedMap';

export interface WithCacheFixedOptions extends Partial<ArgToKeyOptions> {
  /**
   * Capacity of cached records
   */
  capacity: number;

  /**
   * Custom cache pointer
   */
  cachePointer?: WithCachePointer;
}

export const cacheFixed = /*#__PURE__*/ new WeakMap<
  WithCachePointer,
  FixedMap<string, any>
>();

/**
 * Wrap a function to cache results by arguments
 *
 * But with capacity limitation
 *
 * @example
 * const sum = withCacheFixed({ capacity: 1 }, (a, b) => {
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
export function withCacheFixed<T extends AnyFunction>(
  { capacity, cachePointer, ...options }: WithCacheFixedOptions,
  fn: T,
): WithCacheResult<T> {
  const pointer = cachePointer || fn;

  const getPointer = () => fn;

  const getBucket = () => {
    let fnCache = cacheFixed.get(pointer);

    if (!fnCache) {
      fnCache = new FixedMap(capacity);
      cacheFixed.set(pointer, fnCache);
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
