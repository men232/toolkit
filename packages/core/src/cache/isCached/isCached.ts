import type { AnyFunction } from '@/types';
import { type WithCachePointer, isWithCache } from '../createWithCache';
import { type ArgToKeyOptions, argToKey } from '../createWithCache/utils';
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
 * isCached(findUser, 100500); // true
 *
 * @group Cache
 */
export function isCached<T extends AnyFunction>(
  fn: AnyFunction,
  ...args: Parameters<T>
) {
  let argToKeyOptions: ArgToKeyOptions = { objectStrategy: 'ref' };
  let cachePointer: WithCachePointer = fn;
  let cached = false;

  if (isWithCache(fn)) {
    argToKeyOptions = fn.$cache.argToKeyOptions;
  }

  const cacheKey = args.map(v => argToKey(v, argToKeyOptions)).join('_');

  if (isWithCache(fn)) {
    cached = fn.$cache.getBucket().has(cacheKey);
    cachePointer = fn.$cache.getPointer();

    if (cached) return true;
  }

  return !![cache, cacheFixed, cacheBucket, cacheLRU].some(storage =>
    storage.get(cachePointer)?.has(cacheKey),
  );
}
