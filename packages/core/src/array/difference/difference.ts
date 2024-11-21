/**
 * Computes the difference between arrays.
 *
 * This function takes arrays and returns a new array containing the elements
 * that are not present in any other arrays.
 *
 * @template T
 * @param arrays - The arrays from which to derive the difference.
 * @returns {T[]} A new array containing the elements that are not present in other arrays.
 *
 * @example
 * const array1 = [1, 2, 3, 4, 5];
 * const array2 = [2, 4];
 * const array3 = [1, 5];
 * const result = difference(array1, array2, array3);
 * // result will be [3] since 1, 2, 4 and 5 are in other arrays and are excluded from the result.
 */
export function difference<T>(...arrays: readonly T[][]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];

  const [first, ...rest] = arrays;
  const blacklist = new Set();
  const set = new Set(first);

  for (const items of rest) {
    for (const item of items) {
      if (blacklist.has(item)) continue;
      if (set.has(item)) {
        set.delete(item);
        blacklist.add(item);
        continue;
      }

      set.add(item);
    }
  }

  return Array.from(set);
}
