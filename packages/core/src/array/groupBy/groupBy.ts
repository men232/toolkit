import { isFunction } from '@/is';
import { setOwnProperty } from '@/object/setOwnProperty';
import type { IsPropertyKey, ToPropertyKey } from '../keyBy/types';

export function groupBy<T, K extends keyof T>(
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, unknown>, T[]>;

export function groupBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, unknown>, T[]>;

export function groupBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode?: false,
): Map<K, T[]>;

export function groupBy<T, K extends keyof T>(
  array: readonly T[],
  keyBy: K,
  objectMode: true,
): Record<ToPropertyKey<T[K]>, T[]>;

export function groupBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: K,
  objectMode?: true,
): Record<ToPropertyKey<IsPropertyKey<T, K, unknown>>, T[]>;

export function groupBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode: true,
): Record<ToPropertyKey<K>, T[]>;

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
  var getItemKey = isFunction(keyBy)
    ? keyBy
    : (item: any) => item?.[keyBy as any];

  var len = array.length,
    i = 0,
    item,
    key,
    bucket;

  if (objectMode === true) {
    var obj: Record<any, any> = {};

    for (; i < len; i++) {
      item = array[i];
      key = getItemKey(item);
      bucket = obj[key];

      if (Array.isArray(bucket)) {
        bucket.push(item);
      } else {
        setOwnProperty(obj, key, [item]);
      }
    }

    return obj;
  }

  var map = new Map();

  for (; i < len; i++) {
    item = array[i];
    key = getItemKey(item);
    bucket = map.get(key);

    if (bucket === undefined) {
      map.set(key, [item]);
    } else {
      bucket.push(item);
    }
  }

  return map;
}
