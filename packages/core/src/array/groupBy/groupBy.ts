import { isFunction } from '@/is';
import type { IsPropertyKey, MaybePropertyKey } from '../keyBy/types';

export function groupBy<T, K extends MaybePropertyKey<T>>(
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, K>, T[]>;

export function groupBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode?: false,
): Map<K, T[]>;

export function groupBy<T, K extends MaybePropertyKey<T>>(
  array: readonly T[],
  keyBy: K,
  objectMode: true,
): Record<K, T[]>;

export function groupBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode: true,
): Record<K, T[]>;

/**
 * @group Array
 * @example
 * const arr = [
 *   { id: 1, name: 'a' },
 *   { id: 2, name: 'a' },
 *   { id: 3, name: 'b' },
 * ];
 * const grouped = groupBy(arr, 'name', true);
 *
 * console.log(grouped.a);
 * // [{ id: 1, name: 'a' }, { id: 2, name: 'a' }]
 */
export function groupBy(
  array: readonly any[],
  keyBy: unknown | ((item: any) => unknown),
  objectMode?: boolean,
): any {
  const getItemKey = isFunction(keyBy)
    ? keyBy
    : (item: any) => item?.[keyBy as any];

  let key;

  if (objectMode === true) {
    const result: Record<any, any> = {};

    for (const item of array) {
      key = getItemKey(item);
      result[key] = result[key] || [];
      result[key].push(item);
    }

    return result as any;
  }

  const result = new Map();

  for (const item of array) {
    key = getItemKey(item);

    if (!result.has(key)) {
      result.set(key, [item]);
    } else {
      result.get(key).push(item);
    }
  }

  return result;
}
