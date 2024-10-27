import { nextTickIteration } from '../nextTickIteration';

/**
 * Same as `arr.find()` but with async predicate.
 *
 * Basic idea to avoid block event loop while iteration over large array.
 *
 * @example
 * const users = Array.from({ length: 100000 }).map((_, idx) => ({
 *   id: idx,
 *   name: 'User: ' + (idx + 1)
 * }));
 *
 * async function findById(userId: number) {
 *   return await asyncFind(users, (user) => user.id === userId);
 * }
 *
 * Promise.all([
 *   findById(5000),
 *   findById(6000),
 * ]).then(console.log);
 *
 * @group Promise
 */
export async function asyncFind<T>(
  array: T[],
  callbackfn: (
    value: T,
    index: number,
    array: T[],
  ) => Promise<unknown> | unknown,
) {
  const cooldown = nextTickIteration(10);

  let i = 0;

  while (i < array.length) {
    await cooldown();

    const result = await callbackfn(array[i], i, array);

    if (Boolean(result)) {
      return array[i];
    }

    i++;
  }

  return undefined;
}
