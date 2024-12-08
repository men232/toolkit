import { assert } from '@/assert';
import { round2digits } from '@/num/round2digits';

/**
 * Converts seconds to a decimal representation of hours and minutes (HH.MM) rounded to two decimal places.
 *
 * This function takes a number of seconds, calculates the number of whole hours and minutes,
 * and converts them into a two-decimal representation where:
 * - The integer part represents the hours.
 * - The fractional part represents the minutes (rounded to 2 digits).
 *
 * @param {number} seconds - The total number of seconds to convert into hours and minutes.
 * @returns {number} - A decimal number in the format HH.MM representing the converted time.
 *
 * @example
 * secondsToHm(3661);
 * // Returns 1.01 (1 hour and 1 minute)
 *
 * @example
 * secondsToHm(7322);
 * // Returns 2.02 (2 hours and 2 minutes)
 *
 * @example
 * secondsToHm(59);
 * // Returns 0.59 (0 hours and 59 minutes)
 *
 * @example
 * secondsToHm(3600);
 * // Returns 1.00 (exactly 1 hour)
 *
 * @group Date
 */
export function secondsToHm(seconds: number): number {
  const value = Number(seconds);

  assert.number(value, 'expected number value');

  const h = Math.floor(value / 3600);
  const m = Math.floor((value % 3600) / 60);

  return round2digits(h + m / 100, 2);
}
