import { set } from '../set';

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
 */
export function unflatten(obj: object, separator = '_') {
  const result = {};

  Object.keys(obj).forEach(path => {
    set(result, path.split(separator), (obj as any)[path]);
  });

  return result;
}
