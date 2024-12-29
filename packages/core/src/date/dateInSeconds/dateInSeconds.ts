import { type TimestampMsInput, timestampMs } from '../timestampMs';

/**
 * Returns a `Date` object representing a time that is the given number of seconds
 * before or after a base time.
 *
 * @param {number} seconds - The number of seconds to add to or subtract from the base time.
 *                           Positive values move forward in time, and negative values move backward.
 * @param {TimestampMsInput} [fromValue=Date.now()] - The base time.
 * @returns {Date} A `Date` object representing the computed time.
 *
 * @example
 * // Get the date 60 seconds from now
 * dateInSeconds(60); // Returns a Date object 1 minute in the future
 *
 * @example
 * // Get the date 30 seconds before a specific time
 * dateInSeconds(-30, new Date('2023-01-01T00:00:00Z')); // Returns 2022-12-31T23:59:30Z
 *
 * @example
 * // Use a timestamp as the base time
 * dateInSeconds(10, 1672531200000); // Returns a Date object 10 seconds after the base timestamp
 *
 * @group Date
 */
export function dateInSeconds(
  seconds: number,
  fromValue: TimestampMsInput = Date.now(),
): Date {
  return new Date(timestampMs(fromValue) + seconds * 1000);
}
