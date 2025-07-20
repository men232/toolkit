import { nextTickIteration } from '../nextTickIteration';

/**
 * Asynchronously iterates over an array, executing the provided callback for each element with support for parallel processing.
 *
 * This function is similar to `Array.prototype.forEach()`, but it allows asynchronous operations in parallel for each array element.
 * It also prevents blocking the event loop while iterating through large arrays, improving performance for heavy tasks.
 * The function processes items in batches to manage concurrency and can be configured to process multiple items at the same time.
 *
 * **Note**: The callback function can return either a promise or a value. If it returns a promise, `asyncForEach` will wait for it to resolve before moving to the next iteration.
 *
 * @param array - The array to iterate over.
 * @param callbackfn - The async callback function to execute for each element.
 *  This function takes three parameters:
 *   - `value`: The current element of the array.
 *   - `index`: The index of the current element in the array.
 *   - `array`: The array that is being iterated over.
 *  The function should either return a `void` or a `Promise` that resolves when the async operation is done.
 *
 * @param {Object} [options] - Optional settings to control the concurrency of the operation.
 * @param {number} [options.concurrency=1] - The number of items to process in parallel. Defaults to 1 (sequential processing).
 *
 * @returns {Promise<void>} A promise that resolves when all elements have been processed.
 *
 * @example
 * async function task(taskName: string) {
 *   const largeArray = Array.from({ length: 100000 }).map((_, idx) => idx);
 *
 *   await asyncForEach(largeArray, (value) => {
 *     if (value % 100 === 0) {
 *       console.log(taskName, 'handle:', value);
 *     }
 *   });
 * }
 *
 * Promise.all([
 *   task('task 1'),
 *   task('task 2'),
 * ]);
 *
 * @group Promise
 */
export function asyncForEach<T>(
  array: T[],
  callbackfn: (
    value: T,
    index: number,
    array: Array<T>,
  ) => Promise<void> | void,
  { concurrency = 1 } = {},
): Promise<void> {
  concurrency = Math.max(concurrency, 1);

  var i = 0;
  var cooldown = nextTickIteration(10);
  var tasks: Promise<any>[] = Array(concurrency);

  return new Promise((resolve, reject) => {
    var processNextBatch = () => {
      if (i >= array.length) {
        resolve();
        return;
      }

      cooldown()
        .then(() => {
          for (var idx = 0; idx < concurrency; idx++) {
            tasks[idx] = Promise.resolve(i);

            if (i < array.length) {
              tasks[idx] = tasks[idx].then(itemIndex =>
                callbackfn(array[itemIndex], itemIndex, array),
              );
            }

            i++;
          }

          return Promise.all(tasks);
        })
        .then(() => {
          if (i < array.length) {
            // Schedule next batch on next tick to avoid call stack buildup
            setTimeout(processNextBatch, 0);
          } else {
            resolve();
          }
        })
        .catch(reject);
    };

    processNextBatch();
  });
}
