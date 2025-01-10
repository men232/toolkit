import _defaultsDeep from 'lodash/defaultsDeep.js';

/**
 * Recursively assigns default properties.
 * @param object The destination object.
 * @param sources The source objects.
 * @return Returns object.
 *
 * @example
 * const obj = { name: 'Alice', age: 30 };
 * const defaults = { name: 'Bob', age: 25, country: 'Wonderland' };
 *
 * deepDefaults(obj, defaults);
 * console.log(obj);
 * // Output: { name: 'Alice', age: 30, country: 'Wonderland' }
 * // The 'name' and 'age' properties are not overwritten since they already exist.
 *
 * @example
 * const obj = { user: { name: 'Alice' } };
 * const defaults = { user: { age: 25 } };
 *
 * deepDefaults(obj, defaults);
 * console.log(obj);
 * // Output: { user: { name: 'Alice', age: 25 } }
 * // The 'age' property is added to 'user', while 'name' remains unchanged.
 *
 * @group Object
 */
export const deepDefaults = _defaultsDeep;
