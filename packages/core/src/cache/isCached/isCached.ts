import type { AnyFunction } from '@/types';
import { type WithCachePointer, isWithCache } from '../createWithCache';
import { argToKey } from '../createWithCache/utils';
import { cache } from '../withCache';
import { cacheBucket } from '../withCacheBucket';
import { cacheFixed } from '../withCacheFixed';
import { cacheLRU } from '../withCacheLRU';

/**
 * Check if function has cached result
 *
 * @example
 * const findUser = withCache((id: number) => db.users.findById(id));
 *
 * const user = findUser(100500);
 *
 * console.log(isCached(findUser, 100500)); // true
 *
 * @group Cache
 */
export function isCached<T extends AnyFunction>(
  fn: AnyFunction,
  ...args: Parameters<T>
) {
  const cacheKey = args.map(argToKey).join('_');

  let pointer: WithCachePointer = fn;
  let cached = false;

  if (isWithCache(fn)) {
    cached = fn.$cache.getBucket().has(cacheKey);
    pointer = fn.$cache.getPointer();

    if (cached) return true;
  }

  return !![cache, cacheFixed, cacheBucket, cacheLRU].some(storage =>
    storage.get(pointer)?.has(cacheKey),
  );
}
