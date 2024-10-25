import { isObject } from '@/is';
import { hasOwn } from '../hasOwn';

/**
 * Creates a new object composed of the picked object properties.
 *
 * This function takes an object and an array of keys, and returns a new object that
 * includes only the properties corresponding to the specified keys.
 *
 * @template T - The type of object.
 * @template K - The type of keys in object.
 * @param {T} obj - The object to pick keys from.
 * @param {K[]} keys - An array of keys to be picked from the object.
 * @returns {Pick<T, K>} A new object with the specified keys picked.
 *
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * const result = pick(obj, ['a', 'c']);
 * // result will be { a: 1, c: 3 }
 *
 * @group Object
 */
export function pick<T extends Record<string, any>, U extends keyof T>(
  obj: T | null | undefined,
  keys: Readonly<Array<U> | Set<U> | Array<string> | Set<string>>,
): Pick<T, U> {
  const keysSet = Array.isArray(keys)
    ? new Set(keys)
    : keys instanceof Set
      ? keys
      : undefined;

  const result: any = {};

  if (!keysSet || !isObject(obj)) {
    return result;
  }

  for (const key of keysSet.values()) {
    if (hasOwn(obj, key)) {
      result[key] = (obj as any)[key];
    }
  }

  return result;
}
