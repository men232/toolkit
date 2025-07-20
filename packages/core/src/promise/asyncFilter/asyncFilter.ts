import { nextTickIteration } from '@/promise';

/**
 * Asynchronously filters an array using an async predicate function.
 *
 * This function processes an array using an async function as the predicate,
 * allowing you to avoid blocking the event loop while iterating over large arrays.
 * It ensures that the iteration happens asynchronously with minimal impact on the event loop,
 * making it useful for processing large datasets or performing async operations on each element.
 *
 * @param array - The array to be filtered.
 * @param predicate - The async predicate function.
 *  It takes three arguments: the current value, the index of the current value, and the full array.
 *  It should return a boolean value or a promise that resolves to a boolean indicating whether the value should be kept in the result array.
 *
 * @returns {Promise<T[]>} A promise that resolves to a new array containing the elements that satisfy the predicate.
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
export function asyncFilter<T>(
  array: T[],
  predicate: (
    value: T,
    index: number,
    array: Array<T>,
  ) => Promise<boolean> | boolean,
): Promise<T[]> {
  var i = 0;
  var result: T[] = [];
  var cooldown = nextTickIteration(10);

  return new Promise((resolve, reject) => {
    var processNextBatch = () => {
      if (i < array.length) {
        cooldown()
          .then(() => predicate(array[i], i, array))
          .then(valid => {
            if (Boolean(valid)) {
              result.push(array[i]);
            }

            i++;
            setTimeout(processNextBatch, 0);
          })
          .catch(reject);
      } else {
        resolve(result);
      }
    };

    processNextBatch();
  });
}
