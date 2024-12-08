import { isNumber } from '@/is';

/**
 * Converts a Unix timestamp (in seconds) to a `Date` object.
 *
 * This function accepts a timestamp in seconds (number) and returns a `Date` object
 * corresponding to that timestamp. If an invalid number is passed (non-numeric or NaN),
 * it returns `null`.
 *
 * @param {number} value - The Unix timestamp (in seconds) to convert into a `Date` object.
 * @returns {Date | null} The `Date` object corresponding to the provided timestamp, or `null`
 * if the value is not a valid number.
 *
 * @example
 * const date = timestampToDate(1609459200);
 * console.log(date); // Outputs: Thu Jan 01 2021 00:00:00 GMT+0000 (UTC)
 *
 * // Invalid input
 * console.log(timestampToDate('invalid')); // Outputs: null
 * console.log(timestampToDate(NaN)); // Outputs: null
 * console.log(timestampToDate(null)); // Outputs: null
 *
 * @group Date
 */
export function timestampToDate(value: number): Date | null {
  if (!isNumber(value)) return null;
  return new Date(value * 1000);
}
