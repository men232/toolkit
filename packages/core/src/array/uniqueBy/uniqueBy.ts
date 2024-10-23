import { isFunction } from '@/is';
import { get } from '@/object/get';

/**
 * @group Array
 *
 * @description
 * Extract the elements from an array that are unique according to a comparator function
 *
 * @example
 * const users = [
 *     { id: 1, role: 'admin' },
 *     { id: 2, role: 'admin' },
 *     { id: 3, role: 'user' },
 *     { id: 4, role: 'user' },
 * ];
 *
 * const uniqRoles = uniqueBy(users, (v) => v.role);
 * // [
 * //     { id: 1, role: 'admin },
 * //     { id: 3, role: 'user },
 * // ]
 */
export function uniqueBy<T>(
  array: T[],
  comparator: ((value: T) => any) | PropertyKey,
): T[] {
  const seen = new Set();

  if (!isFunction(comparator)) {
    const key = comparator;
    comparator = value => get(value, key);
  }

  return array.filter(value => {
    const computed = (comparator as any)(value);
    const hasSeen = seen.has(computed);
    if (!hasSeen) {
      seen.add(computed);
    }
    return !hasSeen;
  });
}
