import { isFunction } from '@/is';
import { get } from '@/object/get';

/**
 * Extracts unique elements from an array based on a comparator function or property key.
 *
 * This function allows you to determine uniqueness based on custom criteria by passing
 * a comparator function or a property key. The function will return a new array containing
 * only the first occurrence of elements that are unique according to the specified comparator.
 * If the comparator is a property key, uniqueness will be determined based on the value
 * of that property.
 *
 * @example
 * const users = [
 *     { id: 1, role: 'admin' },
 *     { id: 2, role: 'admin' },
 *     { id: 3, role: 'user' },
 *     { id: 4, role: 'user' },
 * ];
 *
 * const uniqRoles = uniqBy(users, (v) => v.role);
 * // [
 * //     { id: 1, role: 'admin' },
 * //     { id: 3, role: 'user' },
 * // ]
 *
 * @example
 * const products = [
 *     { id: 1, category: 'electronics', name: 'Phone' },
 *     { id: 2, category: 'electronics', name: 'Laptop' },
 *     { id: 3, category: 'furniture', name: 'Sofa' },
 * ];
 *
 * const uniqCategories = uniqBy(products, 'category');
 * // [
 * //     { id: 1, category: 'electronics', name: 'Phone' },
 * //     { id: 3, category: 'furniture', name: 'Sofa' },
 * // ]
 *
 * @param array The array to extract unique elements from.
 * @param comparator A function that computes the value to determine uniqueness or a property key.
 *                  If a string is passed, it is treated as a property key, and uniqueness is
 *                  determined based on the value of that property.
 * @returns A new array containing only the first occurrence of each unique element based on the comparator.
 *
 * @group Array
 */
export function uniqBy<T>(
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
