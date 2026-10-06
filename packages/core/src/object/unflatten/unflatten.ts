import { isObject } from '@/is';
import { isUnsafeToWriteProperty } from '@/str/isUnsafeToWriteProperty';

/**
 * Converts a flattened object back into a nested structure.
 *
 * Takes an object with dot-separated keys and converts it into a nested object,
 * where each dot-separated part of the key represents a deeper level in the object.
 *
 * @param {Object} obj - The object to unflatten.
 * @param {string} [separator='_'] - The separator used to split the keys into their nested form. Defaults to '_'.
 * @returns {Object} The unflattened object, with nested keys restored to their original structure.
 *
 * @example
 * const obj = {
 *   'name': 'Andrew',
 *   'config_canReadPost': true,
 *   'config_canUpdatePost': true,
 * };
 *
 * unflatten(obj);
 * // Returns:
 * // {
 * //   name: 'Andrew',
 * //   config: {
 * //     canReadPost: true,
 * //     canUpdatePost: true
 * //   },
 * // }
 *
 * @example
 * const flattenedObj = {
 *   'user.firstName': 'John',
 *   'user.lastName': 'Doe',
 *   'address.city': 'New York'
 * };
 *
 * unflatten(flattenedObj, '.');
 * // Returns:
 * // {
 * //   user: {
 * //     firstName: 'John',
 * //     lastName: 'Doe'
 * //   },
 * //   address: {
 * //     city: 'New York'
 * //   }
 * // }
 *
 * @group Object
 * @author lukeed
 */
export function unflatten(input: object, separator = '_') {
  if (!isObject(input)) {
    return {};
  }

  let arr, tmp: any, next, output;
  let i = 0,
    k,
    key;

  for (k in input) {
    tmp = output;
    arr = k.split(separator);

    for (i = 0; i < arr.length; ) {
      key = arr[i++];

      if (tmp == null) {
        tmp = empty(+key);
        output = output || tmp;
      }

      if (isUnsafeToWriteProperty(key)) break;

      if (i < arr.length) {
        next = Object.hasOwn(tmp, key) ? tmp[key] : undefined;
        tmp =
          next !== null && typeof next === 'object'
            ? next
            : (tmp[key] = empty(+arr[i]));
      } else {
        tmp[key] = (input as any)[k];
      }
    }
  }

  return output === undefined ? {} : output;
}

function empty(key: unknown): any {
  return key === key ? [] : {};
}
