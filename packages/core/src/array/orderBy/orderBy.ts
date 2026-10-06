import { isFunction } from '@/is';
import { compareAscending } from './compareAscending';

/**
 * Sort array by multiple fields
 *
 * @example
 * // Sample data: an array of objects representing users
 * const users = [
 *   { name: 'Alice', age: 30, score: 85 },
 *   { name: 'Bob', age: 25, score: 90 },
 *   { name: 'Charlie', age: 35, score: 90 },
 *   { name: 'Dave', age: 30, score: 70 },
 * ];
 *
 * // Sort users first by score in descending order, then by age in ascending order
 * const sortedUsers = orderBy(users, ['score', 'age'], ['desc', 'asc']);
 *
 * // Output the sorted array
 * console.log(sortedUsers);
 *
 * @replaces `list.sort((a, b) => a.x - b.x || a.y - b.y)` — sorts in place and only works for numbers;
 * `orderBy(list, ['x', 'y'], ['asc', 'asc'])` returns a stable sorted copy (typed `readonly T[]`), also
 * compares strings (by code unit, not `localeCompare`) and puts `null`/`undefined` last in `asc`.
 * @detect `\.sort\(\s*\(\s*\w+\s*,\s*\w+\s*\)\s*=>\s*\(?\s*\w+\.\w+\s*-\s*\w+\.\w+\s*\)?\s*\|\|`
 *
 * @group Array
 */
export function orderBy<T>(
  array: readonly T[],
  fields: (string | ((item: T) => any))[],
  orders: ('asc' | 'desc')[],
): readonly T[] {
  return [...array].sort((a, b) => {
    let index = -1,
      length = fields.length,
      ordersLength = orders.length;

    while (++index < length) {
      const field = fields[index];
      const filedFn = isFunction(field);

      const objCriteria = filedFn ? field(a) : (a as any)?.[field];
      const othCriteria = filedFn ? field(b) : (b as any)?.[field];

      const result = compareAscending(objCriteria, othCriteria);

      if (result) {
        if (index >= ordersLength) {
          return result;
        }
        return result * (orders[index] === 'desc' ? -1 : 1);
      }
    }

    return 0;
  });
}
