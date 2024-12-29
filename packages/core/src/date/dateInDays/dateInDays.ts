import { type TimestampMsInput, timestampMs } from '../timestampMs';

/**
 * Returns a `Date` object representing a time that is the given number of days
 * before or after a base time.
 *
 * @param {number} days - The number of days to add to or subtract from the base time.
 *                        Positive values move forward in time, and negative values move backward.
 * @param {TimestampMsInput} [fromValue=Date.now()] - The base time as a timestamp.
 * @returns {Date} A `Date` object representing the computed time.
 *
 * @example
 * // Get the date 7 days from now
 * dateInDays(7); // Returns a Date object 7 days in the future
 *
 * @example
 * // Get the date 5 days before a specific time
 * dateInDays(-5, new Date('2023-01-01T00:00:00Z')); // Returns 2022-12-27T00:00:00Z
 *
 * @example
 * // Use a timestamp as the base time
 * dateInDays(2, 1672531200000); // Returns a Date object 2 days after the base timestamp
 *
 * @group Date
 */
export function dateInDays(
  days: number,
  fromValue: TimestampMsInput = Date.now(),
): Date {
  return new Date(timestampMs(fromValue) + days * 60 * 60 * 24 * 1000);
}
