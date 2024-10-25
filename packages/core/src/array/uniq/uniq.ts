/**
 * Returns new array without duplicates
 *
 * @example
 * console.log(uniq([1, 2, 3, 4, 1, 3])) // [1, 2, 3, 4]
 *
 * @group Array
 */
export function uniq<T extends any[]>(value: T): T {
  if (!Array.isArray(value)) {
    return [] as any;
  }

  return [...new Set(value)] as T;
}
