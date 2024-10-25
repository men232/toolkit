import { isObject } from '@/is';

/**
 * Same as `Object.assign()` but deep
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
 * console.log(user); // '{ id: 1, name: 'Andrew', data: { a: 1, b: 2, c: 3 } }'
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
