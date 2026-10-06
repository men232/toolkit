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
 * @replaces `list.filter((v, i, a) => a.indexOf(v) === i)` — O(n²) and drops every `NaN` (`indexOf` never
 * finds it); `uniq` uses a Set, keeps one `NaN` and the first-occurrence order.
 * @detect `\.filter\(\s*\(\s*\w+\s*,\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\w+\.indexOf\(\s*\w+\s*\)\s*===\s*\w+\s*\)`
 * @replaces `[...new Set(list)]` or `Array.from(new Set(list))` — same result for an array, as one call.
 * Caveat: `uniq` returns `[]` for a non-array input such as a Set or a string.
 * @detect `\[\s*\.\.\.\s*new Set\(|Array\.from\(\s*new Set\(`
 *
 * @group Array
 */
export function uniq<T>(value: readonly T[]): T[] {
  if (!Array.isArray(value)) {
    return [] as any;
  }

  return [...new Set(value)];
}
