import { SPECIAL_VALUE, SPECIAL_VALUE_2 } from '@/specialValue';
import type { Awaitable, SpecialValue } from '@/types';
import { nextTickIteration } from '../nextTickIteration';

/**
 * Asynchronously filters and maps an array in a single pass, with bounded
 * concurrency.
 *
 * The callback may be async and receives a `skip` sentinel as its second
 * argument. Return any mapped value (or a promise of one) to keep it, or return
 * `skip` to exclude the current element. Combining the filter and map avoids the
 * extra allocation and second traversal of chaining `.filter().map()`.
 *
 * Up to `concurrency` callbacks run at a time. Even though callbacks may settle
 * out of order, the resolved array preserves **strict source order** and
 * contains no gaps for skipped elements. Work is spread across microtasks so a
 * large input does not block the event loop.
 *
 * If any callback rejects (or throws), the returned promise rejects with that
 * error and no further elements are processed.
 *
 * @param array - The source array to iterate over. It is not mutated.
 * @param callbackfn - Called for each element with `(value, skip, index, array)`.
 *   Return the mapped value (or a promise of it) to keep, or `skip` to drop the
 *   element.
 * @param options - Options object.
 * @param options.concurrency - Maximum number of callbacks in flight at once.
 *   Defaults to `1` (sequential); values below `1` are clamped to `1`.
 * @returns A promise resolving to a new array of the mapped values, in source
 *   order, excluding any skipped elements.
 *
 * @example
 * ```ts
 * // Keep even numbers and double them, dropping the rest.
 * await asyncFilterMap([1, 2, 3, 4], (value, skip) =>
 *   value % 2 === 0 ? value * 2 : skip,
 * );
 * // => [4, 8]
 * ```
 *
 * @example
 * ```ts
 * // Fetch users concurrently, skipping the ones that don't exist.
 * const users = await asyncFilterMap(
 *   ids,
 *   async (id, skip) => {
 *     const res = await fetch(`/users/${id}`);
 *     return res.ok ? res.json() : skip;
 *   },
 *   { concurrency: 5 },
 * );
 * ```
 *
 * @group Promise
 */
export function asyncFilterMap<T, U>(
  array: T[],
  callbackfn: (
    value: T,
    skip: SpecialValue,
    index: number,
    array: T[],
  ) => Awaitable<U | SpecialValue>,
  { concurrency = 1 } = {},
): Promise<U[]> {
  concurrency = Math.max(concurrency, 1);
  var mapped: U[] = [];

  if (array.length === 0) {
    return Promise.resolve(mapped);
  }

  var hasError = false;
  // Holds completed callback results keyed by original index until they can be
  // flushed into `mapped` in strict source order.
  var buffer: (U | SpecialValue)[] = Array(array.length).fill(SPECIAL_VALUE_2);
  var flushIndex = 0;
  var completed = 0;
  var currentIndex = 0;
  var cooldown = nextTickIteration(10);

  return new Promise((resolve, reject) => {
    var processItem = (index: number) => {
      if (hasError || index >= array.length) return;

      cooldown()
        .then(() => callbackfn(array[index], SPECIAL_VALUE, index, array))
        .then(transformed => {
          if (hasError) return;

          buffer[index] = transformed;

          // Flush every contiguous completed slot from the front, keeping strict
          // source order and pushing only non-skipped values (no gaps).
          while (
            flushIndex < array.length &&
            buffer[flushIndex] !== SPECIAL_VALUE_2
          ) {
            if (buffer[flushIndex] !== SPECIAL_VALUE) {
              mapped.push(buffer[flushIndex] as U);
            }
            flushIndex++;
          }

          completed++;

          if (completed >= array.length) {
            resolve(mapped);
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
