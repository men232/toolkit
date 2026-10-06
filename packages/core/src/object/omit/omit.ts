import { isObject } from '@/is';
import { setOwnProperty } from '../setOwnProperty';

/**
 * Creates a new object with specified keys omitted.
 *
 * This function takes an object and an array of keys, and returns a new object that
 * excludes the properties corresponding to the specified keys.
 *
 * @template T - The type of object.
 * @template K - The type of keys in object.
 * @param {T} obj - The object to omit keys from.
 * @param {K[]} keys - An array of keys to be omitted from the object.
 * @returns {Omit<T, K>} A new object with the specified keys omitted.
 *
 * @example
 * const obj = { a: 1, b: 2, c: 3 };
 * const result = omit(obj, ['b', 'c']);
 * // result will be { a: 1 }
 *
 * @group Object
 */
export function omit<T extends Record<string, any>, U extends keyof T>(
  obj: T,
  excludes: Readonly<Array<U> | Set<U> | Array<string> | Set<string>>,
): Omit<T, U> {
  var list: readonly any[] | undefined;
  var set: Set<any> | undefined;

  if (Array.isArray(excludes)) {
    if (excludes.length > 8) set = new Set(excludes);
    else list = excludes;
  } else if (excludes instanceof Set) {
    set = excludes;
  } else {
    return obj;
  }

  const result: any = {};

  if (!isObject(obj)) {
    return result;
  }

  var keys = Object.keys(obj);

  for (var i = 0, key; i < keys.length; i++) {
    key = keys[i];

    if (set !== undefined ? set.has(key) : list!.includes(key)) continue;

    setOwnProperty(result, key, (obj as any)[key]);
  }

  return result;
}
