import { assert } from '@/assert';
import { round2digits } from '@/num/round2digits';

/**
 * Converts a decimal representation of hours and minutes (HH.MM) into total seconds.
 *
 * This function takes a decimal number in the format `HH.MM`, where:
 * - The integer part represents the number of hours.
 * - The fractional part represents the minutes (in decimal) and is converted accordingly.
 *
 * It returns the total time in seconds.
 *
 * @param {number} hm - The time represented in HH.MM format (e.g., 2.30 for 2 hours and 30 minutes).
 * @returns {number} - The total number of seconds equivalent to the provided HH.MM value.
 *
 * @example
 * hmToSeconds(1.00);
 * // Returns 3600 (1 hour = 3600 seconds)
 *
 * @example
 * hmToSeconds(2.30);
 * // Returns 9000 (2 hours and 30 minutes = 2 * 3600 + 30 * 60 = 9000 seconds)
 *
 * @example
 * hmToSeconds(0.15);
 * // Returns 900 (0 hours and 15 minutes = 15 minutes = 900 seconds)
 *
 * @example
 * hmToSeconds(3.45);
 * // Returns 13500 (3 hours and 45 minutes = 3 * 3600 + 45 * 60 = 13500 seconds)
 *
 * @group Date
 */
export function hmToSeconds(hm: number): number {
  hm = Number(hm);

  assert.number(hm, 'expected number value');

  const h = Math.floor(hm);
  const m = round2digits(hm - h) * 100;

  return h * 3600 + m * 60;
}
