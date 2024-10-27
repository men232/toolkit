import { nextTickIteration } from '../nextTickIteration';

/**
 * Same as `arr.map()` but with async callback
 *
 * Basic idea to avoid block event loop while iteration over large array.
 *
 * @example
 * const users = Array.from({ length: 100 }).map((_, idx) => ({
 *   id: idx,
 *   name: 'User: ' + (idx + 1)
 * }));
 *
 * async function withUserClients() {
 *   return await asyncMap(users, async (user) => {
 *     const clients = await db.clients.find({ user: user.id });
 *
 *     return { ...user, clients };
 *   }, { concurrency: 10 });
 * }
 *
 * Promise.all([
 *   withUserClients(),
 *   otherUsefulTask(),
 * ]).then(console.log);
 *
 * @group Promise
 */
export async function asyncMap<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: Array<T>) => Promise<U> | U,
  { concurrency = 1 } = {},
): Promise<Array<U>> {
  let result: U[] = [];

  concurrency = Math.max(concurrency, 1);

  const cooldown = nextTickIteration(10);

  let i = 0;

  const handle = (value: T, index: number) => {
    return callbackfn(value, i + index, array);
  };

  while (i < array.length) {
    await cooldown();

    const batch = await Promise.all(
      array.slice(i, i + concurrency).map(handle),
    );

    result = result.concat(batch);
    i += batch.length;
  }

  return result;
}
