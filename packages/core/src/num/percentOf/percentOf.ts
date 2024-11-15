import { round2digits } from '../round2digits';

/**
 * Calculates the specified percentage of a given value.
 * The result is the value multiplied by the percentage divided by 100.
 * Optionally rounds the result to a specified number of decimal places.
 *
 * @param {number} value - The value from which the percentage will be calculated.
 * @param {number} percent - The percentage to calculate from the value.
 * @param {number} [digits] - Optional. The number of decimal places to round the result to. If not provided, the result will not be rounded.
 * @returns {number} The calculated percentage of the value. If `digits` is provided, the result is rounded to the specified decimal places.
 *
 * @example
 * percentOf(200, 20);
 * // Returns: 40 (20% of 200)
 *
 * @example
 * percentOf(200, 20, 2);
 * // Returns: 40.00 (20% of 200 rounded to 2 decimal places)
 *
 * @example
 * percentOf(150, 15);
 * // Returns: 22.5 (15% of 150)
 *
 * @example
 * percentOf(1000, 10, 1);
 * // Returns: 100.0 (10% of 1000 rounded to 1 decimal place)
 *
 * @group Numbers
 */
export function percentOf(value: number, percent: number, digits?: number) {
  let result = (percent / 100) * value;

  if (digits) {
    result = round2digits(result, digits);
  }

  return result;
}
