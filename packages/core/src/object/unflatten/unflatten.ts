/**
 * Unflat flatten object
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
