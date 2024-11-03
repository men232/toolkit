import { set } from '../set';

/**
 * Un flat flatten object
 *
 * @example
 * const obj = {
 *   'name': 'Andrew',
 *   'config.canReadPost': true,
 *   'config.canUpdatePost': true,
 * };
 *
 * unflatten(obj);
 *
 * // {
 * //   name: 'Andrew',
 * //   config: {
 * //     canReadPost: true,
 * //     canUpdatePost: true
 * //   },
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
