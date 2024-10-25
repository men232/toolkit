import type { AnyFunction } from '@/types';
import {
  type WithCachePointer,
  type WithCacheResult,
  createWithCache,
} from '../createWithCache';

export const cache = /*#__PURE__*/ new WeakMap<
  // @ts-expect-error
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
export function withCache<T extends AnyFunction>(fn: T): WithCacheResult<T> {
  const getPointer = () => fn;

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
  });
}
