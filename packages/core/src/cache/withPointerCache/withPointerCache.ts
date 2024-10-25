import type { AnyFunction } from '@/types';
import { cache } from '../withCache';

/**
 * @example TODO
 * @group Cache
 */
export function withPointerCache<T>(
  pointer: object,
  dependencies: string[],
  fn: () => T,
): T {
  const cacheKey = dependencies.map(String).join('_');

  let fnCache = cache.get(pointer as AnyFunction);

  if (fnCache) {
    const cached = fnCache.get(cacheKey);
    if (cached) {
      return cached;
    }
  } else {
    fnCache = new Map();
    cache.set(pointer as AnyFunction, fnCache);
  }

  const newValue = fn();

  fnCache.set(cacheKey, newValue);

  return newValue;
}
