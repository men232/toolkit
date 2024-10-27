import { nextTickIteration } from '@/promise';

/**
 * Same as `arr.filter()` but with async predicate
 *
 * Basic idea to avoid block event loop while iteration over large array.
 *
 * @example
 * const users = Array.from({ length: 100000 }).map((_, idx) => ({
 *   id: idx,
 *   name: 'User: ' + (idx + 1)
 * }));
 *
 * async function first100Users() {
 *   return await asyncFilter(users, (user) => user.id < 100);
 * }
 *
 * Promise.all([
 *   first100Users(),
 *   otherUsefulTask(),
 * ]).then(console.log);
 *
 * @group Promise
 */
export async function asyncFilter<T>(
  array: T[],
  predicate: (
    value: T,
    index: number,
    array: Array<T>,
  ) => Promise<boolean> | boolean,
): Promise<T[]> {
  const result: T[] = [];

  const cooldown = nextTickIteration(10);

  for (let idx = 0; idx < array.length; idx++) {
    await cooldown();

    const value = array[idx];
    const valid = await predicate(value, idx, array);

    if (valid) {
      result.push(value);
    }
  }

  return result;
}
