/**
 * Returns the intersection of arrays.
 *
 * This function takes arrays and returns a new array containing the elements that are
 * present in all arrays.
 *
 * @template T - The type of elements in the array.
 * @returns {T[]} A new array containing the elements that are present in both arrays.
 *
 * @example
 * const array1 = [1, 2, 3, 4, 5];
 * const array2 = [3, 4, 5, 6, 7];
 * const result = intersection(array1, array2);
 * // result will be [3, 4, 5] since these elements are in both arrays.
 */
export function intersection<T>(...arrays: readonly T[][]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0];

  return arrays.reduce((acc, curr) => {
    const set = new Set(curr);
    return acc.filter(item => set.has(item));
  });
}
