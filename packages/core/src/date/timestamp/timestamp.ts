import { isDate } from '@/is';

/**
 * Returns the number of seconds since the Unix epoch (January 1, 1970).
 *
 * This function accepts either a `Date` object or a timestamp in milliseconds (number).
 * If no argument is provided, it defaults to the current timestamp in seconds.
 *
 * @param {Date | number} [fromValue=Date.now()] - The date or timestamp to convert.
 * If not provided, the current date and time will be used.
 *
 * @returns {number} The number of seconds since the Unix epoch for the provided date or timestamp.
 *
 * @example
 * // Using a Date object
 * const date = new Date('2020-01-01T00:00:00Z');
 * console.log(timestamp(date)); // Returns 1577836800 (seconds since Unix epoch)
 *
 * // Using a timestamp in milliseconds
 * const timestampInMs = 1609459200000;
 * console.log(timestamp(timestampInMs)); // Returns 1609459200 (seconds since Unix epoch)
 *
 * // Using the current time
 * console.log(timestamp()); // Returns current seconds since Unix epoch
 *
 * @group Date
 */
export function timestamp(fromValue: Date | number = Date.now()) {
  if (isDate(fromValue)) {
    fromValue = fromValue.getTime();
  }

  return Math.floor(fromValue / 1000);
}
