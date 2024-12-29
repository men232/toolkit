import { isString } from '@/is';
import type { TimeString } from '@/types';

/**
 * Checks if a given value is a valid `TimeString`.
 *
 * @param {unknown} value - The value to check if it's a valid `TimeString`.
 * @returns {value is TimeObject} - Returns `true` if the value is a valid `TimeString`, otherwise `false`.
 *
 * @example
 * // Valid TimeString
 * isTimeString('15:30'); // true
 *
 * @example
 * // Invalid TimeString
 * isTimeObject('15:30:00'); // false
 *
 * @example
 * // Invalid TimeString (out-of-range hours)
 * isTimeObject('26:00'); // false
 *
 * @group Date
 */
export function isTimeString(value: unknown): value is TimeString {
  if (!isString(value)) return false;
  const parts = value.split(':').map(Number);
  if (parts.length !== 2) return false;
  const [h, m] = parts;
  return h >= 0 && h < 24 && m >= 0 && m < 60;
}
