import { isString } from '@/is';
import type { TimeString } from '@/types';

/**
 * Checks if a given value is a valid `TimeString`.
 *
 * @param {unknown} value - The value to check if it's a valid `TimeString`.
 * @returns {value is TimeString} - Returns `true` if the value is a valid `TimeString`, otherwise `false`.
 *
 * @example
 * // Valid TimeString
 * isTimeString('15:30'); // true
 *
 * @example
 * // Invalid TimeString
 * isTimeString('15:30:00'); // false
 *
 * @example
 * // Invalid TimeString (out-of-range hours)
 * isTimeString('26:00'); // false
 *
 * @group Date
 */
export function isTimeString(value: unknown): value is TimeString {
  if (!isString(value)) return false;

  const colon = value.indexOf(':');
  const minutesLength = value.length - colon - 1;

  if (colon < 1 || colon > 2 || minutesLength < 1 || minutesLength > 2) {
    return false;
  }

  const h = parseDigits(value, 0, colon);
  const m = parseDigits(value, colon + 1, value.length);

  return h >= 0 && h < 24 && m >= 0 && m < 60;
}

function parseDigits(value: string, start: number, end: number): number {
  let result = 0;

  for (let i = start; i < end; i++) {
    const digit = value.charCodeAt(i) - 48;

    if (digit < 0 || digit > 9) return -1;

    result = result * 10 + digit;
  }

  return result;
}
