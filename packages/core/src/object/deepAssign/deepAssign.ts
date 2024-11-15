import { isObject } from '@/is';

/**
 * Performs a deep merge of the source object into the destination object.
 *
 * This function recursively copies properties from the source object to the destination object.
 * If a property is an object itself, it will recursively merge its properties. Otherwise,
 * the value will be directly assigned to the destination object.
 *
 * ⚠️ **Mutates the destination object**: The destination object is modified in place.
 *
 * @param {object} dest - The target object that will be modified with properties from the source.
 * @param {object} source - The source object whose properties will be copied to the destination.
 * @returns {void} This function does not return a value, as it mutates the destination object.
 *
 * @example
 * const user = {
 *   id: 1,
 *   name: 'Andrew',
 *   data: { a: 1, b: 2 },
 * };
 *
 * deepAssign(user, { data: { c: 3 } });
 *
 * console.log(user);
 * // Outputs: '{ id: 1, name: 'Andrew', data: { a: 1, b: 2, c: 3 } }'
 *
 * @example
 * const config = { theme: { dark: true }, version: '1.0' };
 * const updates = { theme: { light: false }, version: '2.0' };
 *
 * deepAssign(config, updates);
 *
 * console.log(config);
 * // Outputs: '{ theme: { dark: true, light: false }, version: '2.0' }'
 *
 * @group Object
 */
export const deepAssign = (dest: object, source: object): void => {
  for (const key of Object.keys(source)) {
    const destValue = (dest as any)[key];
    const sourceValue = (source as any)[key];

    if (isObject(destValue) && isObject(sourceValue)) {
      deepAssign(destValue as any, sourceValue as any);
    } else {
      (dest as any)[key] = sourceValue;
    }
  }
};
