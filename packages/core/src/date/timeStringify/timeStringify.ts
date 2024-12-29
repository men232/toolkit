import { assert } from '@/assert';
import type { TimeValue } from '@/types';
import { createTimeObject } from '../createTimeObject';

export function timeStringify(value: TimeValue): string;
export function timeStringify(
  value: TimeValue,
  returnsNullWhenInvalid: true,
): string | null;

/**
 * Converts a time value into a string formatted as "HH:MM".
 *
 * @param {TimeValue} value - A time value.
 * @param {boolean} [returnsNullWhenInvalid=false] - If `true`, the function returns `null`
 *                         instead of throwing an error when the input is invalid.
 *                         Defaults to `false`.
 * @returns {string | null} A string representing the time in "HH:MM" format, or `null`
 *                          if the input is invalid and `returnsNullWhenInvalid` is `true`.
 *
 * @throws {Error} If the input is invalid and `returnsNullWhenInvalid` is `false`.
 *
 * @example
 * // Convert a time object to a string
 * timeStringify({ h: 9, m: 5 }); // "09:05"
 *
 * @example
 * // Convert a string time value to a formatted string
 * timeStringify("7:30"); // "07:30"
 *
 * @example
 * // Handle invalid input gracefully
 * timeStringify("invalid", true); // null
 *
 * @example
 * // Handle invalid input with exception
 * timeStringify("invalid"); // Throws Error
 *
 * @group Date
 */
export function timeStringify(
  value: TimeValue,
  returnsNullWhenInvalid = false,
): string | null {
  const timeObject = createTimeObject(value, true);

  if (!timeObject) {
    assert.ok(
      returnsNullWhenInvalid,
      'Failed to stringify time from: ' + JSON.stringify(value),
    );
    return null;
  }

  let { h, m } = timeObject;

  const hStr = Math.ceil(h).toString().padStart(2, '0').slice(-2);
  const mStr = Math.ceil(m).toString().padStart(2, '0').slice(-2);

  return `${hStr}:${mStr}`;
}
