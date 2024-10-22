import { isPromise } from '@/is';
import { deepClone } from '@/object';
import { def } from '@/object/def';
import type { AnyFunction } from '@/types';
import { isWithCache } from '../createWithCache';
import { SYM_WITH_CACHE } from '../createWithCache/utils';

/**
 * Utility wrapper function to deep clone results
 */
export function withDeepClone<T extends AnyFunction>(fn: T): T {
  const wrapFn = function (...args) {
    // @ts-expect-error
    const result = fn.apply(this, args);

    if (isPromise(result)) {
      return result.then(deepClone);
    }

    return deepClone(result);
  } as T;

  if (isWithCache(fn)) {
    (wrapFn as any).$cache = fn.$cache;
  }

  if ('$cache' in fn) {
    (wrapFn as any).$cache = fn.$cache;
    def(wrapFn, SYM_WITH_CACHE, true);
  }

  return wrapFn;
}
