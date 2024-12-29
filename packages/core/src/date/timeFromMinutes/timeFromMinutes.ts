import { assert } from '@/assert';
import { isNumber } from '@/is';
import type { TimeObject } from '@/types';

export function timeFromMinutes(value: number): TimeObject;
export function timeFromMinutes(
  value: number,
  returnsNullWhenInvalid: true,
): TimeObject | null;

/**
 * Converts a total number of minutes into a time object with hours and minutes.
 *
 * @param {number} value - The total number of minutes to be converted.
 *                         Can be positive, negative, or zero.
 * @param {boolean} [returnsNullWhenInvalid=false] - If `true`, the function returns `null`
 *                         instead of throwing an error when the input is invalid.
 *                         Defaults to `false`.
 * @returns {TimeObject | null} An object representing the time in `{ h: hours, m: minutes }` format,
 *                              or `null` if `returnsNullWhenInvalid` is `true` and the input is invalid.
 *
 * @throws {Error} If the input is not a number and `returnsNullWhenInvalid` is `false`.
 *
 * @example
 * // Convert 150 minutes to time
 * timeFromMinutes(150); // { h: 2, m: 30 }
 *
 * @example
 * // Handle invalid input with `returnsNullWhenInvalid` set to `true`
 * timeFromMinutes('invalid', true); // null
 *
 * @example
 * // Handle negative minutes
 * timeFromMinutes(-90); // { h: 22, m: 30 }
 *
 * @group Date
 */
export function timeFromMinutes(
  value: number,
  returnsNullWhenInvalid = false,
): TimeObject | null {
  if (!isNumber(value)) {
    assert.ok(
      returnsNullWhenInvalid,
      'Failed to time parse from minutes: ' + value,
    );
    return null;
  }

  if (value === 0) {
    return { h: 0, m: 0 };
  }

  value = value % 1440;

  if (value < 0) {
    value += 1440;
  }

  const h = Math.floor(value / 60);
  const m = value % 60;

  return { h, m };
}
