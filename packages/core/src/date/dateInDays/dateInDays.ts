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
 * @replaces `new Date(Date.now() - n * 24 * 60 * 60 * 1000)` — one call with no millisecond arithmetic
 * (`dateInDays(-n)`). Returns a `Date` (use `.getTime()` for ms). Like the hand-written code it adds n×24h, not
 * calendar days, so it drifts across DST; an unparsable base string falls back to epoch 0.
 * @detect `(Date\.now\(\)|\.getTime\(\))\s*[-+]\s*\(?\s*([\w.]+\s*\*\s*)?(24\s*\*\s*60\s*\*\s*60\s*\*\s*1000|24\s*\*\s*3600\s*\*\s*1000|1000\s*\*\s*60\s*\*\s*60\s*\*\s*24|86_?400_?000|864e5)\b`
 *
 * @group Date
 */
export function dateInDays(
  days: number,
  fromValue: TimestampMsInput = Date.now(),
): Date {
  return new Date(timestampMs(fromValue) + days * 60 * 60 * 24 * 1000);
}
