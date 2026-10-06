import { arrayable } from '@/array';
import { argsToKey } from '@/cache/createWithCache/utils';
import type { Arrayable } from '@/types';

type ResolverFn<R extends Promise<any>, T = any, A extends any[] = any[]> = (
  this: T,
  ...args: A
) => R;

type WithResolve<R extends Promise<any>, T = any, A extends any[] = any[]> = (
  this: T,
  ...args: A
) => R;

/**
 * A function that generates cache key based on the arguments.
 *
 * @param args - The original function arguments
 * @param computeKey - A helper function to stringify arguments into a cache key
 * @returns A cache key string if a variant should be used, or undefined to skip this variant
 */
type GetCacheKey<T = any, A extends any[] = any[]> = (
  this: T,
  args: A,
  computeKey: (...args: any[]) => string,
) => string | symbol | null | undefined;

var KEY_OPTIONS = { objectStrategy: 'json' } as const;

var computeArgsKey = (args: any[]): string => argsToKey(args, KEY_OPTIONS);

var stringifyArgs = (...args: any[]): string => computeArgsKey(args);

/**
 * Wraps an async function to guarantee single execution for identical arguments.
 * Acts as a request deduplication mechanism - when multiple calls are made with the same
 * arguments before the first call completes, all calls wait for and receive the result
 * of the first execution.
 *
 * This is useful for preventing redundant async operations like duplicate API calls or
 * database queries that are triggered simultaneously.
 *
 * @template R - The Promise return type of the wrapped function
 * @template T - The `this` context type for the function
 * @template A - The argument types tuple for the function
 *
 * @param fn - The async function to wrap
 * @param getCacheKey - Optional array of functions to generate alternative cache keys.
 *   Useful when different argument combinations should be treated as equivalent.
 *
 * @returns A wrapped version of the function with deduplication behavior
 *
 * @example Basic usage - deduplicating database queries
 * ```ts
 * const fetchUserById = withResolve((userId: number) =>
 *   db.users.findById(userId)
 * );
 *
 * // Only produces 1 database query, both calls receive the same result
 * const [user1, user2] = await Promise.all([
 *   fetchUserById(100),
 *   fetchUserById(100)
 * ]);
 * ```
 *
 * @example With cache key variants
 * ```ts
 * const fetchUser = withResolve(
 *   (id: number, options?: { fresh?: boolean }) => api.getUser(id, options),
 *   [
 *     // Treat calls with/without options as equivalent if fresh is false/undefined
 *     (args, computeKey) => {
 *       const [id, options] = args;
 *       if (options?.fresh) {
 *         return null;
 *       }
 *
 *       return computeKey(id, {});
 *     }
 *   ]
 * );
 *
 * // Both calls deduplicated to single request
 * await Promise.all([
 *   fetchUser(1),
 *   fetchUser(1, { fresh: false })
 * ]);
 * ```
 *
 * @remarks
 * - The cache is held only during the execution of the first call
 * - Once the promise resolves or rejects, the cache entry is cleared
 * - All waiting calls receive the same result (success or error)
 * - Works with both resolved and rejected promises
 *
 * @replaces `const p = load(key).finally(() => pending.delete(key)); pending.set(key, p)` (in-flight dedupe) — one
 * wrapper; the key is the EJSON of the arguments by default, the entry is cleared on both resolve and reject, and a
 * synchronous throw becomes a rejection. The wrapped function must return a promise.
 * @detect `\.finally\(\s*\(\)\s*=>\s*(\{\s*)?[\w.]+\.delete\(`
 *
 * @group Promise
 */
export function withResolve<
  R extends Promise<any>,
  T = any,
  A extends any[] = any[],
>(
  fn: ResolverFn<R, T, A>,
  getCacheKey?: Arrayable<GetCacheKey<T, A>>,
): WithResolve<R, T, A> {
  var cache = new Map<string | symbol, Promise<any>>();
  var cacheKeyVariants = arrayable(getCacheKey);
  var variantsLength = cacheKeyVariants.length;

  return function (this: T, ...args: A) {
    let cacheKey: string | symbol | undefined;
    let pending: Promise<any> | undefined;
    let keys: (string | symbol)[] | undefined;

    for (var i = 0; i < variantsLength; i++) {
      var newCacheKey = cacheKeyVariants[i].call(this, args, stringifyArgs);

      if (newCacheKey === undefined) {
        continue;
      }
      if (newCacheKey === null) {
        return resolver(this, args);
      }

      cacheKey = newCacheKey;
      pending = cache.get(cacheKey);
      if (pending) return pending;

      if (variantsLength > 1) {
        if (keys === undefined) keys = [];
        keys.push(cacheKey);
      }
    }

    if (cacheKey === undefined) {
      cacheKey = computeArgsKey(args);
      pending = cache.get(cacheKey);
      if (pending) return pending;
    }

    var promise = resolver(this, args);

    if (keys !== undefined && keys.length > 1) {
      var allKeys = keys;
      var clearAll = () => {
        for (var j = 0; j < allKeys.length; j++) cache.delete(allKeys[j]);
      };

      for (var j = 0; j < allKeys.length; j++) cache.set(allKeys[j], promise);
      promise.then(clearAll, clearAll);

      return promise;
    }

    var key = cacheKey;
    var clear = () => cache.delete(key);

    cache.set(key, promise);
    promise.then(clear, clear);

    return promise;
  } as WithResolve<R, T, A>;

  function resolver(self: T, args: A): Promise<any> {
    try {
      return fn.apply(self, args);
    } catch (err) {
      return Promise.reject(err);
    }
  }
}
