import { isPromise } from '@/is';
import { def } from '@/object/def';
import type { AnyFunction } from '@/types';
import { type ArgToKeyOptions, SYM_WITH_CACHE, argToKey } from './utils';

interface CreateWithCacheOptions<T extends AnyFunction>
  extends Partial<ArgToKeyOptions> {
  getBucket: (pointer: WithCachePointer) => WithCacheStorage;
  getPointer: () => WithCachePointer;
  fn: T;
}

/**
 * @group Cache
 */
export type WithCachePointer = object | Function | symbol;

/**
 * @group Cache
 */
export interface WithCacheStorage {
  get(key: unknown): unknown;
  has(key: unknown): boolean;
  delete(key: unknown): void;
  set(key: unknown, value: unknown): void;
}

/**
 * @group Cache
 */
export interface WithCache {
  $cache: {
    getBucket: () => WithCacheStorage;
    getPointer: () => WithCachePointer;
    argToKeyOptions: ArgToKeyOptions;
  };
}

/**
 * @group Cache
 */
export type WithCacheResult<T extends AnyFunction> = T & WithCache;

/**
 * @group Cache
 */
export function createWithCache<T extends AnyFunction>({
  fn,
  getPointer,
  getBucket,
  objectStrategy = 'ref',
}: CreateWithCacheOptions<T>): WithCacheResult<T> {
  const isAsync = fn.constructor.name === 'AsyncFunction';

  const argToKeyOptions: ArgToKeyOptions = { objectStrategy };

  const $cache: WithCache['$cache'] = {
    getBucket: () => getBucket(getPointer()),
    getPointer,
    argToKeyOptions,
  };

  const wrapFn = ((...args: Parameters<T>) => {
    const storage = getBucket(getPointer());
    const cacheKey = args.map(v => argToKey(v, argToKeyOptions)).join('_');

    if (storage.has(cacheKey)) {
      const value = storage.get(cacheKey);
      return isAsync ? Promise.resolve(value) : value;
    }

    const newValue = fn(...args);

    if (isPromise(newValue)) {
      // cache only success result
      return newValue.then(value => {
        storage.set(cacheKey, value);
        return value;
      });
    }

    storage.set(cacheKey, newValue);

    return newValue;
  }) as T;

  (wrapFn as any).$cache = $cache;

  def(wrapFn, SYM_WITH_CACHE, true);

  return wrapFn as any;
}

/**
 * Returns true when function is cached
 * @group Cache
 */
export function isWithCache(
  value: unknown,
): value is WithCacheResult<AnyFunction> {
  return !!value && (value as any)[SYM_WITH_CACHE] === true;
}
