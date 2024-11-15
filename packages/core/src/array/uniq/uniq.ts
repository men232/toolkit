/**
 * Returns a new array with duplicates removed.
 *
 * This function creates a new array that contains only unique values,
 * preserving the order of the original elements.
 *
 * @example
 * uniq([1, 2, 3, 4, 1, 3]); // [1, 2, 3, 4]
 * uniq([5, 5, 5, 5, 5]); // [5]
 * uniq(['a', 'b', 'a', 'c']); // ['a', 'b', 'c']
 * uniq([]); // [] (returns an empty array for empty input)
 *
 * @param value The array from which duplicates will be removed.
 * @returns A new array containing only the unique values from the input array.
 *
 * @group Array
 */
export function uniq<T extends any[]>(value: T): T {
  if (!Array.isArray(value)) {
    return [] as any;
  }

  return [...new Set(value)] as T;
}
