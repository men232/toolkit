import { isFunction } from '@/is';
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
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, K>, T>;

export function keyBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode?: false,
): Map<K, T>;

export function keyBy<T, K extends MaybePropertyKey<T>>(
  array: readonly T[],
  keyBy: K,
  objectMode: true,
): Record<K, T>;

export function keyBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode: true,
): Record<K, T>;

export function keyBy(
  array: readonly any[],
  keyBy: unknown | ((item: any) => unknown),
  objectMode?: boolean,
): any {
  const getItemKey = isFunction(keyBy)
    ? keyBy
    : (item: any) => item?.[keyBy as any];

  if (objectMode === true) {
    const result: Record<any, any> = {};

    for (const item of array) {
      result[getItemKey(item)] = item;
    }

    return result as any;
  }

  const result = new Map();

  for (const item of array) {
    result.set(getItemKey(item), item);
  }

  return result as any;
}
