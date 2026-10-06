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
 *
 * @group Array
 */
export function difference<T>(...arrays: (readonly T[])[]): T[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return [...arrays[0]];

  var set = new Set<T>(arrays[0]);
  var seen = new Set<T>();
  var last = arrays.length - 1;
  var fresh: T[] = [];
  var items, item, a, i;

  for (a = 1; a <= last; a++) {
    items = arrays[a];

    if (a > 1) {
      for (i = 0; i < fresh.length; i++) {
        seen.delete(fresh[i]);
        set.add(fresh[i]);
      }

      fresh = [];
    }

    for (i = 0; i < items.length; i++) {
      item = items[i];

      if (seen.has(item)) continue;

      seen.add(item);

      if (!set.delete(item)) fresh.push(item);
    }
  }

  var result = Array.from(set);

  for (i = 0; i < fresh.length; i++) result.push(fresh[i]);

  return result;
}
