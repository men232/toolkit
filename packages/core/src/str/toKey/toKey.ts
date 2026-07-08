/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @param {*} value The value to inspect.
 * @group Strings
 */
export function toKey(value: any): string | symbol {
  if (typeof value === 'string' || typeof value === 'symbol') {
    return value;
  }
  if (Object.is(value?.valueOf?.(), -0)) {
    return '-0';
  }
  return String(value);
}
