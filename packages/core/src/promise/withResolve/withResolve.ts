import { arrayable } from '@/array';
import { argToKey } from '@/cache/createWithCache/utils';
import { isString } from '@/is';
import type { Arrayable } from '@/types';
import { type Defer, defer } from '../defer';

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
type GetCacheKey = (
  args: any[],
  computeKey: (...args: any[]) => string,
) => string | null | undefined;

const stringifyArgs = (...args: any[]): string => {
  return args.map(v => argToKey(v, { objectStrategy: 'json' })).join('_');
};

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
 * @group Promise
 */
export function withResolve<
  R extends Promise<any>,
  T = any,
  A extends any[] = any[],
>(
  fn: ResolverFn<R, T, A>,
  getCacheKey?: Arrayable<GetCacheKey>,
): WithResolve<R, T, A> {
  const cache = new Map<string | symbol, Defer[]>();
  const cacheKeyVariants = arrayable(getCacheKey);

  return function (this: T, ...args: A) {
    let cacheKey: string | symbol = stringifyArgs(...args);

    if (cacheKeyVariants?.length) {
      for (const getCacheKey of cacheKeyVariants) {
        const newCacheKey = getCacheKey(args, stringifyArgs);

        if (newCacheKey === null) {
          cacheKey = Symbol(); // Use random symbol as cache key
          break;
        } else if (isString(newCacheKey) && cache.has(newCacheKey)) {
          cacheKey = newCacheKey;
          break;
        }
      }
    }

    const defers = cache.get(cacheKey) || [];
    const size = defers.length;

    const q = defer<unknown>();
    defers.push(q);
    cache.set(cacheKey, defers);

    if (size) {
      return q.promise;
    }

    resolver(this, cacheKey, args);

    return q.promise;
  } as WithResolve<R, T, A>;

  function resolver(self: T, cacheKey: string | symbol, args: A) {
    const onSuccess = (r: any) => {
      const defers = cache.get(cacheKey) || [];

      for (const q of defers) {
        q.resolve(r);
      }

      cache.delete(cacheKey);
    };

    const onError = (r: any) => {
      const defers = cache.get(cacheKey) || [];

      for (const q of defers) {
        q.reject(r);
      }

      cache.delete(cacheKey);
    };

    try {
      fn.apply(self, args).then(onSuccess).catch(onError);
    } catch (err) {
      onError(err);
    }
  }
}
