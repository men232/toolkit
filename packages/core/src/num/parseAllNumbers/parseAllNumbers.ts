import { isNumber, isString } from '@/is';

/**
 * Parses all numbers from a given string and returns them as an array of numbers.
 * Supports dot decimals and ignores commas unless they appear as part of a number format.
 * Returns an empty array when the input is invalid or no numbers are found.
 *
 * @param {unknown} input - The input value to parse numbers from.
 * @returns {number[]} - An array of parsed numbers. Returns an empty array if no numbers are found.
 *
 * @example
 * parseAllNumbers("The temperature is -23.5°C and humidity is 60%.");
 * // Returns: [-23.5, 60]
 *
 * @example
 * parseAllNumbers("No numbers here!");
 * // Returns: []
 *
 * @example
 * parseAllNumbers(42);
 * // Returns: [42]
 *
 * @example
 * parseAllNumbers("1,234 and 56.78 are numbers");
 * // Returns: [1.234, 56.78]
 *
 * @example
 * parseAllNumbers(["Invalid type"]);
 * // Returns: []
 *
 * @group Numbers
 */
export function parseAllNumbers(value: unknown): number[] {
  if (isNumber(value)) {
    return [value];
  }

  if (!isString(value)) {
    return [];
  }

  const matches = value.replace(/,/g, '.').match(/-?\d+(\.\d+)?/g);

  if (!matches) {
    return [];
  }

  return matches.map(Number).filter(isNumber);
}
