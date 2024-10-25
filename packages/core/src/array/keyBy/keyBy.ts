import type { IsPropertyKey, MaybePropertyKey } from './types';

/**
 * Maps each element of an array based on a provided key.
 *
 * @example
 * const data = [
 *     { id: 1, name: 'group 1' },
 *     { id: 2, name: 'group 2' },
 *     { id: 1, name: 'group 2' }
 * ];
 *
 * const result = keyBy(data, 'id');
 * console.log(Object.entries(result));
 * // [
 * //    [1, [{ id: 1, name: 'group 1' }, { id: 1, name: 'group 2' }],
 * //    [2, { id: 2, name: 'group 2' }],
 * // ]
 *
 * @group Array
 */
export function keyBy<T, K extends MaybePropertyKey<T>>(
  array: T[],
  keyBy: K,
): Map<IsPropertyKey<T, K, K>, T> {
  const result = new Map();

  for (const item of array) {
    result.set((item as any)?.[keyBy], item);
  }

  return result;
}
