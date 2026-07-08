/**
 * Get object tag of value
 * @group Object
 */
export const getTag = function <T>(value: T): string {
  if (value == null) {
    return value === undefined ? '[object Undefined]' : '[object Null]';
  }
  return Object.prototype.toString.call(value);
};
