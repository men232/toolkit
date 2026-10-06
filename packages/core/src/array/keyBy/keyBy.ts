import { isFunction } from '@/is';
import { setOwnProperty } from '@/object/setOwnProperty';
import type { IsPropertyKey, ToPropertyKey } from './types';

export function keyBy<T, K extends keyof T>(
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, unknown>, T>;

export function keyBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: K,
  objectMode?: false,
): Map<IsPropertyKey<T, K, unknown>, T>;

export function keyBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode?: false,
): Map<K, T>;

export function keyBy<T, K extends keyof T>(
  array: readonly T[],
  keyBy: K,
  objectMode: true,
): Record<ToPropertyKey<T[K]>, T>;

export function keyBy<T, K extends PropertyKey>(
  array: readonly T[],
  keyBy: K,
  objectMode: true,
): Record<ToPropertyKey<IsPropertyKey<T, K, unknown>>, T>;

export function keyBy<T, K>(
  array: readonly T[],
  keyBy: (item: T) => K,
  objectMode: true,
): Record<ToPropertyKey<K>, T>;

/**
 * Maps each element of an array based on a provided key.
 *
 * Each key holds one element; when several elements share a key, the last one wins.
 *
 * @example
 * const data = [
 *     { id: 1, name: 'group 1' },
 *     { id: 2, name: 'group 2' },
 *     { id: 1, name: 'group 2' }
 * ];
 *
 * const result = keyBy(data, 'id');
 * console.log([...result]);
 * // [
 * //    [1, { id: 1, name: 'group 2' }],
 * //    [2, { id: 2, name: 'group 2' }],
 * // ]
 *
 * @replaces `new Map(list.map(x => [x.id, x]))` — `keyBy(list, 'id')` builds the same Map (the last item
 * wins for a repeated key) without the intermediate array of pairs; the key can also be a function.
 * @detect `new Map\(\s*[\w.]+\.map\(\s*\(?\w+\)?\s*=>\s*\[\s*\w+(\.\w+|\[[^\]]+\])\s*,\s*\w+\s*\]\s*,?\s*\)\s*,?\s*\)\s*[^.\s]`
 * @replaces `Object.fromEntries(list.map(x => [x.id, x]))` — `keyBy(list, 'id', true)` returns the same
 * plain object (the last item wins) in one pass.
 * @detect `Object\.fromEntries\(\s*[\w.]+\.map\(\s*\(?\w+\)?\s*=>\s*\[\s*\w+(\.\w+|\[[^\]]+\])\s*,\s*\w+\s*\]\s*\)\s*\)`
 *
 * @group Array
 */
export function keyBy(
  array: readonly any[],
  keyBy: unknown | ((item: any) => unknown),
  objectMode?: boolean,
): any {
  var getItemKey = isFunction(keyBy)
    ? keyBy
    : (item: any) => item?.[keyBy as any];

  var len = array.length,
    i = 0,
    item;

  if (objectMode === true) {
    var obj: Record<any, any> = {};

    for (; i < len; i++) {
      item = array[i];
      setOwnProperty(obj, getItemKey(item), item);
    }

    return obj;
  }

  var map = new Map();

  for (; i < len; i++) {
    item = array[i];
    map.set(getItemKey(item), item);
  }

  return map;
}
