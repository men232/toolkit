import { isObject } from '@/is';
import { def } from '@/object/def';
import type { WithCachePointer, WithCacheResult } from '../createWithCache';
import { SYM_WITH_CACHE } from '../createWithCache/utils';
import { TimeBucket } from '../TimeBucket';
import { cacheBucket } from '../withCacheBucket';

const EMPTY_SYM = Symbol('empty');

interface Options<T extends object, K extends keyof T> {
  sizeMs: number;
  key: K;
  batchSize?: number;
  capacity?: number;
  cachePointer?: WithCachePointer;
  retryEmpty?: boolean;
  resolver?: (values: T[K][]) => Promise<T[]>;
}

/**
 * Caching result of object in batch
 * Accepts duplicate values
 * Result excludes non object values
 */
export function withCacheBucketBatch<T extends object, K extends keyof T>(
  {
    capacity,
    sizeMs,
    key,
    batchSize = 10,
    cachePointer,
    retryEmpty = true,
  }: Options<T, K>,
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
