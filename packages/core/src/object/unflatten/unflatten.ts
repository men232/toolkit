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
export function unflatten(obj: object) {
  const result = {};

  Object.keys(obj).forEach(path => {
    // @ts-expect-error
    _set(result, path, obj[path]);
  });

  return result;
}
