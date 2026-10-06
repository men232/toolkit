import type { AnyFunction } from '@/types';
import { cache } from '../withCache';

/**
 * @example TODO
 * @group Cache
 * @beta
 */
export function withPointerCache<T>(
  pointer: object,
  dependencies: string[],
  fn: () => T,
): T {
  const cacheKey = dependencies.map(String).join('\0');

  let fnCache = cache.get(pointer as AnyFunction);

  if (fnCache) {
    const cached = fnCache.get(cacheKey);
    if (cached !== undefined || fnCache.has(cacheKey)) {
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
