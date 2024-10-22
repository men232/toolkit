import { isObject } from '@/is';

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
 */
export function omit<T extends Record<string, any>, U extends keyof T>(
  obj: T,
  excludes: Readonly<Array<U> | Set<U> | Array<string> | Set<string>>,
): Omit<T, U> {
  const excludesSet = Array.isArray(excludes)
    ? new Set(excludes)
    : excludes instanceof Set
      ? excludes
      : undefined;

  if (!excludesSet) {
    return obj;
  }

  const result: any = {};

  if (!isObject(obj)) {
    return result;
  }

  for (const [key, value] of Object.entries(obj)) {
    if (excludesSet.has(key)) continue;

    result[key] = value;
  }

  return result;
}
