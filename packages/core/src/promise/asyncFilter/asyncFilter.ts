import { nextTickIteration } from '../nextTickIteration';

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
  { concurrency = 1 } = {},
): Promise<T[]> {
  concurrency = Math.max(concurrency, 1);

  if (array.length === 0) {
    return Promise.resolve([]);
  }

  var result: number[] = [];
  var currentIndex = 0;
  var completed = 0;
  var hasError = false;
  var cooldown = nextTickIteration(10);

  return new Promise((resolve, reject) => {
    var processItem = (index: number) => {
      if (hasError || index >= array.length) return;

      cooldown()
        .then(() => predicate(array[index], index, array))
        .then(include => {
          if (hasError) return;
          if (include) {
            result.push(index);
          }

          completed++;

          if (completed >= array.length) {
            resolve(result.toSorted((a, b) => a - b).map(idx => array[idx]));
          } else {
            if (currentIndex < array.length) {
              processItem(currentIndex++);
            }
          }
        })
        .catch(error => {
          if (!hasError) {
            hasError = true;
            reject(error);
          }
        });
    };

    for (; currentIndex < concurrency; currentIndex++) {
      processItem(currentIndex);
    }
  });
}
