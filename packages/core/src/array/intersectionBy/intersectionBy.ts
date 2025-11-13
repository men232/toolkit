import { isFunction } from '@/is';

export function intersectionBy<T>(
  keyBy: keyof T,
  ...arrays: (readonly T[])[]
): T[];

export function intersectionBy<T>(
  keyBy: PropertyKey,
  ...arrays: (readonly T[])[]
): T[];

export function intersectionBy<T>(
  keyBy: (item: T) => unknown,
  ...arrays: (readonly T[])[]
): T[];

/**
 * Returns the intersection of multiple arrays based on a specified key or iteratee function.
 *
 * This function compares elements across arrays using either a property key or a custom
 * function to extract comparison values. Only elements that appear in all arrays
 * (based on their key values) are included in the result.
 *
 * @returns {T[]} A new array containing elements in all arrays. (Deduplicated)
 *
 * @example
 * // Using a property key
 * const users1 = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];
 * const users2 = [{ id: 2, name: 'Bob' }, { id: 3, name: 'Charlie' }];
 * const result = intersectionBy('id', users1, users2);
 * // result will be [{ id: 2, name: 'Bob' }]
 *
 * @example
 * // Using an iteratee function
 * const array1 = [1.2, 2.3, 3.4];
 * const array2 = [3.5, 2.6, 1.8];
 * const result = intersectionBy(Math.floor, array1, array2);
 * // result will be [1.2, 2.3, 3.4] since floor values match
 *
 * @example
 * // With nested properties
 * const products1 = [{ info: { code: 'A1' } }, { info: { code: 'B2' } }];
 * const products2 = [{ info: { code: 'B2' } }, { info: { code: 'C3' } }];
 * const result = intersectionBy(item => item.info.code, products1, products2);
 * // result will be [{ info: { code: 'B2' } }]
 *
 * @group Array
 */
export function intersectionBy(
  keyBy: unknown | ((item: any) => unknown),
  ...arrays: any[]
): any[] {
  var arraysLength = arrays.length;

  if (arraysLength === 0) return [];
  if (arraysLength === 1) return [...arrays[0]];

  var getItemKey = isFunction(keyBy)
    ? keyBy
    : (item: any) => item?.[keyBy as any];

  arrays = arrays.toSorted((a, b) => a.length - b.length);

  var arrayLengths: number[] = [arraysLength];
  var arrayIndices: number[] = [0];
  var arraySets: Set<any>[] = [new Set()];
  var key1, key2;
  var i: number;

  for (i = 1; i < arraysLength; i++) {
    arrayLengths[i] = arrays[i].length;
    arrayIndices[i] = 0;
    arraySets[i] = new Set();
  }

  return arrays[0].filter((item: any) => {
    key1 = getItemKey(item);

    if (arraySets[0].has(key1)) return false;

    arraySets[0].add(key1);

    loop: for (i = 1; i < arraysLength; i++) {
      if (arraySets[i].has(key1)) {
        continue loop;
      }

      for (; arrayIndices[i] < arrayLengths[i]; arrayIndices[i]++) {
        key2 = getItemKey(arrays[i][arrayIndices[i]]);
        arraySets[i].add(key2);

        if (Object.is(key1, key2)) {
          continue loop;
        }
      }

      return false;
    }

    return true;
  });
}
