import { nextTickIteration } from '../nextTickIteration';

/**
 * Asynchronously finds the first element in an array that satisfies the provided async predicate.
 *
 * This function iterates through an array and applies an asynchronous predicate to each element.
 * If the predicate resolves to a truthy value for any element, that element is returned immediately.
 * The function is designed to prevent blocking the event loop during iteration, making it suitable
 * for processing large arrays without impacting performance.
 *
 * @param array - The array to search through.
 * @param callbackfn - The asynchronous predicate function.
 *  It takes three arguments: the current value, the index of the current value, and the full array.
 *  The predicate function should return a boolean or a promise that resolves to a boolean indicating
 *  whether the current value satisfies the condition.
 *
 * @returns {Promise<T | undefined>} A promise that resolves to the first element that satisfies the predicate, or `undefined` if no element matches.
 *
 * @example
 * // Example of using asyncFind to find users by ID asynchronously
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
