import { nextTickIteration } from '../nextTickIteration';

/**
 * Asynchronously maps over an array, applying the provided callback function to each element,
 * with support for parallel processing of array elements.
 *
 * This function is similar to `arr.map()`, but allows asynchronous operations
 * for each array element, helping to avoid blocking the event loop when processing large arrays.
 * It processes the array elements in batches, providing support for concurrency, meaning multiple
 * elements can be processed in parallel.
 *
 * **Note**: The callback function can return either a value or a `Promise`. If a `Promise` is returned,
 * `asyncMap` will wait for it to resolve before moving on to the next iteration.
 *
 * @param array - The array to iterate over.
 * @param callbackfn - The async callback function to apply to each element.
 *  This function takes three parameters:
 *   - `value`: The current element of the array.
 *   - `index`: The index of the current element in the array.
 *   - `array`: The array being processed.
 *  The callback should return either a transformed value (`U`) or a `Promise<U>`.
 *
 * @param {Object} [options] - Optional configuration for controlling concurrency.
 * @param {number} [options.concurrency=1] - The number of items to process concurrently. Default is 1 (sequential processing).
 *
 * @returns {Promise<U[]>} A promise that resolves to an array of transformed elements.
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
export function asyncMap<T, U>(
  array: T[],
  callbackfn: (value: T, index: number, array: Array<T>) => Promise<U> | U,
  { concurrency = 1 } = {},
): Promise<Array<U>> {
  concurrency = Math.max(concurrency, 1);

  if (array.length === 0) {
    return Promise.resolve([]);
  }

  var hasError = false;
  var result: U[] = Array(array.length);
  var completed = 0;
  var currentIndex = 0;
  var cooldown = nextTickIteration(10);

  return new Promise((resolve, reject) => {
    var processItem = (index: number) => {
      if (hasError || index >= array.length) return;

      cooldown()
        .then(() => callbackfn(array[index], index, array))
        .then(transformed => {
          if (hasError) return;

          result[index] = transformed;

          completed++;

          if (completed >= array.length) {
            resolve(result);
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
