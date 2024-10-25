import { type WithCachePointer, isWithCache } from '../createWithCache';
import { argToKey } from '../createWithCache/utils';
import { cache } from '../withCache';
import { cacheBucket } from '../withCacheBucket';
import { cacheFixed } from '../withCacheFixed';
import { cacheLRU } from '../withCacheLRU';

/**
 * Drop cached result
 *
 * @example
 * const findUser = withCache((id: number) => db.users.findById(id));
 *
 * dropCache(findUser, 100500);
 *
 * @group Cache
 */
export function dropCache(
  cachePointer: WithCachePointer,
  ...args: any[]
): boolean {
  const cacheKey = args.map(argToKey).join('_');

  let removed = false;

  if (isWithCache(cachePointer)) {
    if (cachePointer.$cache.getBucket().has(cacheKey)) {
      removed = true;
      cachePointer.$cache.getBucket().delete(cacheKey);
    }

    cachePointer = cachePointer.$cache.getPointer();
  }

  [cache, cacheFixed, cacheBucket, cacheLRU].forEach(map => {
    if (map.get(cachePointer)?.has(cacheKey)) {
      removed = true;
      map.get(cachePointer)?.delete(cacheKey);
    }
  });

  return removed;
}
