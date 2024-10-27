import { type Defer, defer } from '../defer';

type ResolverFn<R extends Promise<any>, T = any, A extends any[] = any[]> = (
  this: T,
  ...args: A
) => R;

type WithResolve<R extends Promise<any>, T = any, A extends any[] = any[]> = (
  this: T,
  ...args: A
) => R;

type GetCacheKeyVariant = (
  args: any[],
  computeKey: (...args: any[]) => string,
) => string | undefined;

const stringifyArgs = (...args: any[]): string => {
  return args.map(v => JSON.stringify(v)).join('_');
};

/**
 * Wrap the function to granite single execution at the same time
 *
 * @example Promise
 * const fetchUserById = withResolve((userId) => db.users.findById(userId));
 *
 * // this way we will produce 1 db query at the same time
 * await Promise.all([
 *   fetchUserById(100),
 *   fetchUserById(100)
 * ])
 *
 * @group Promise
 */
export function withResolve<
  R extends Promise<any>,
  T = any,
  A extends any[] = any[],
>(
  fn: ResolverFn<R, T, A>,
  getCacheKeyVariants?: GetCacheKeyVariant[],
): WithResolve<R, T, A> {
  const cache = new Map<string, Defer[]>();

  return function (this: T, ...args: A) {
    let cacheKey = stringifyArgs(...args);

    if (getCacheKeyVariants?.length) {
      for (const getVariant of getCacheKeyVariants) {
        const newCacheKey = getVariant(args, stringifyArgs);

        if (newCacheKey !== undefined && cache.has(newCacheKey)) {
          cacheKey = newCacheKey;
          break;
        }
      }
    }

    const defers = cache.get(cacheKey) || [];
    const size = defers.length;

    const q = defer();
    defers.push(q);
    cache.set(cacheKey, defers);

    if (size) {
      return q.promise;
    }

    resolver.call(this, cacheKey, ...args);

    return q.promise;
  } as WithResolve<R, T, A>;

  function resolver(this: T, cacheKey: string, ...args: A) {
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
      fn.apply(this, args).then(onSuccess).catch(onError);
    } catch (err) {
      onError(err);
    }
  }
}
