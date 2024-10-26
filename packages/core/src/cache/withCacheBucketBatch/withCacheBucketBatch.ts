import { isObject } from '@/is';
import { def } from '@/object/def';
import type { WithCachePointer, WithCacheResult } from '../createWithCache';
import { SYM_WITH_CACHE } from '../createWithCache/utils';
import { TimeBucket } from '../TimeBucket';
import { cacheBucket } from '../withCacheBucket';

const EMPTY_SYM = Symbol('empty');

export interface WithCacheBucketBatchOptions<
  T extends object,
  K extends keyof T,
> {
  /**
   * Define cached records drops interval.
   */
  sizeMs: number;

  /**
   * Cache record by object key.
   */
  key: K;

  /**
   * Amount of items which will handled by resolver function.
   */
  batchSize?: number;

  /**
   * Capacity of cached records
   */
  capacity?: number;

  /**
   * Custom cache pointer
   */
  cachePointer?: WithCachePointer;

  /**
   * Should we retry resolving for provided item key when previously we got empty result.
   */
  retryEmpty?: boolean;

  /**
   * Resolving item function
   */
  resolver?: (values: T[K][]) => Promise<T[]>;
}

/**
 * In this way we will cache item of resulted array by `key`.
 *
 * Useful when we need for example fetch batch of users by ids but took already cached results if it available.
 *
 * @example TODO
 *
 * @group Cache
 */
export function withCacheBucketBatch<T extends object, K extends keyof T>(
  {
    capacity,
    sizeMs,
    key,
    batchSize = 10,
    cachePointer,
    retryEmpty = true,
  }: WithCacheBucketBatchOptions<T, K>,
  resolver: (values: T[K][]) => Promise<T[]>,
): WithCacheResult<(values: T[K][]) => Promise<Map<string, Readonly<T>>>> {
  const pointer = cachePointer || resolver;

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

  const wrapFn = async (values: any) => {
    const result = new Map();

    let fnCache = getBucket();

    const batchSet = new Set<any>();

    const drainMaybe = async () => {
      if (!batchSet.size) return;

      const items = await resolver(Array.from(batchSet));

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];

        if (!isObject(item)) continue;

        const id = String(item[key]);

        batchSet.delete(id);
        result.set(id, item);
        fnCache?.set(id, item);
      }

      for (const batchItem of batchSet.values()) {
        fnCache?.set(batchItem, EMPTY_SYM);
      }

      batchSet.clear();
    };

    let pos = 0;

    while (pos < values.length) {
      const id = String(values[pos]);
      const item = fnCache.get(id);

      if (item) {
        if (item === EMPTY_SYM) {
          if (retryEmpty) batchSet.add(id);
        } else {
          result.set(id, item);
        }
      } else {
        batchSet.add(id);
      }

      if (batchSet.size >= batchSize) {
        await drainMaybe();
      }

      pos++;
    }

    await drainMaybe();

    return result;
  };

  wrapFn.$cache = { getBucket, getPointer };

  def(wrapFn, SYM_WITH_CACHE, true);

  return wrapFn;
}
