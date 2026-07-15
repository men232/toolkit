import { SPECIAL_VALUE } from '@/specialValue';
import type { SpecialValue } from '@/types';

/**
 * Filters and maps an array in a single pass.
 *
 * The callback receives a `skip` sentinel as its second argument. Return any
 * mapped value to keep it, or return `skip` to exclude the current element from
 * the result. This avoids the extra allocation of chaining `.filter().map()`.
 *
 * @param array - The source array to iterate over. It is not mutated.
 * @param callbackfn - Called for each element with `(value, skip, index, array)`.
 *   Return the mapped value to keep, or `skip` to drop the element.
 * @returns A new array of the mapped values, excluding any skipped elements.
 *
 * @example
 * ```ts
 * // Keep even numbers and double them, dropping the rest.
 * filterMap([1, 2, 3, 4], (value, skip) =>
 *   value % 2 === 0 ? value * 2 : skip,
 * );
 * // => [4, 8]
 * ```
 *
 * @example
 * ```ts
 * // Parse valid numbers, skipping entries that fail to parse.
 * filterMap(['1', 'x', '3'], (value, skip) => {
 *   const n = Number(value);
 *   return Number.isNaN(n) ? skip : n;
 * });
 * // => [1, 3]
 * ```
 *
 * @group Array
 */
export function filterMap<T, U>(
  array: T[],
  callbackfn: (
    value: T,
    skip: SpecialValue,
    index: number,
    array: T[],
  ) => U | SpecialValue,
): U[] {
  var mapped: U[] = [];
  var mappedValue: U | SpecialValue;

  for (var index = 0; index < array.length; index++) {
    mappedValue = callbackfn(array[index], SPECIAL_VALUE, index, array);

    if (mappedValue !== SPECIAL_VALUE) {
      mapped.push(mappedValue as U);
    }
  }

  return mapped;
}
