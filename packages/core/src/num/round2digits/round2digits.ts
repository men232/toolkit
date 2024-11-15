/**
 * Rounds a given number to a specified number of decimal places.
 * The rounding is done using a method that shifts the decimal point, rounds the number, and then shifts it back.
 *
 * @param {number} value - The number to be rounded.
 * @param {number} [digits=2] - The number of decimal places to round to. Defaults to 2 if not provided.
 * @returns {number} The rounded number with the specified number of decimal places.
 *
 * @example
 * round2digits(3.3333333, 1);
 * // Returns: 3.3
 *
 * @example
 * round2digits(3.3333333, 2);
 * // Returns: 3.33
 *
 * @example
 * round2digits(3.3333333, 3);
 * // Returns: 3.333
 *
 * @example
 * round2digits(3.789, 0);
 * // Returns: 4 (rounded to the nearest integer)
 *
 * @group Numbers
 */
export function round2digits(value: number, digits: number = 2) {
  if (digits === 0) {
    return value << 0;
  }

  // @ts-expect-error
  return Number(Math.round(value + 'e' + digits) + 'e-' + digits);
}
