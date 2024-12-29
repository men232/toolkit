import { isDate, isNumber, isString } from '@/is';

/**
 * The base time as a timestamp, `Date` object,
 * or a similar format that the `timestampMs` function can parse.
 */
export type TimestampMsInput = Date | string | number;

/**
 * Returns or converts the given input into milliseconds since the Unix epoch.
 *
 * @param {TimestampMsInput} [fromValue=Date.now()] - The input value to be converted to milliseconds.
 *                          Can be a `Date` object, a timestamp (number), or a string representing a date.
 *                          Defaults to the current time.
 * @returns {number} The number of milliseconds since the Unix epoch. Returns `0` if the input is invalid.
 *
 * @example
 * // Get milliseconds from a Date object
 * timestampMs(new Date('2023-01-01T00:00:00Z')); // 1672531200000
 *
 * @example
 * // Get milliseconds from a timestamp
 * timestampMs(1672531200000); // 1672531200000
 *
 * @example
 * // Get milliseconds from a date string
 * timestampMs('2023-01-01T00:00:00Z'); // 1672531200000
 *
 * @example
 * // Handle invalid input
 * timestampMs('invalid-date'); // 0
 *
 * @example
 * // Use the default value (current time)
 * timestampMs(); // Current timestamp in milliseconds
 *
 * @group Date
 */
export function timestampMs(fromValue: TimestampMsInput = Date.now()): number {
  if (isDate(fromValue)) {
    fromValue = fromValue.getTime();
  } else if (isString(fromValue)) {
    const dt = new Date(fromValue);
    fromValue = isDate(dt) ? dt.getTime() : 0;
  }

  return isNumber(fromValue) ? fromValue : 0;
}
