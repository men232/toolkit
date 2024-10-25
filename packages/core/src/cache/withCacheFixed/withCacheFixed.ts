import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';
import { FixedMap } from '../FixedMap';

export const cacheFixed = /*#__PURE__*/ new WeakMap<
  // @ts-expect-error
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
  size: number,
  fn: T,
): WithCacheResult<T> {
  const pointer = fn;

  const getPointer = () => fn;

  const getBucket = () => {
    let fnCache = cacheFixed.get(pointer);

    if (!fnCache) {
      fnCache = new FixedMap(size);
      cacheFixed.set(pointer, fnCache);
    }

    return fnCache;
  };

  return createWithCache({
    fn,
    getBucket,
    getPointer,
  });
}
