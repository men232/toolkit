/**
 * Sanitizes a string by removing all non-numeric characters, leaving only digits.
 * Useful for extracting numeric values from strings, such as when you want to
 * extract a number from a string containing units or other non-numeric text.
 *
 * @example
 * // Extracts numeric values from a string with units
 * escapeNumeric('use 320px'); // '320'
 *
 * // Strips out non-numeric characters from a string
 * escapeNumeric('USD 1,000.50'); // '100050'
 *
 * // Returns undefined if no numeric characters are found
 * escapeNumeric('No numbers here!'); // undefined
 *
 * @param str - The input string to be sanitized.
 * @returns A string containing only the numeric characters, or `undefined` if no numbers are found.
 *
 * @group Strings
 */
export function escapeNumeric(str: string) {
  const result = String(str).replace(/\D/g, '');

  if (!result.length) {
    return undefined;
  }

  return result;
}
