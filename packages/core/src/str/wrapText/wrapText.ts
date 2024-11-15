/**
 * Truncates the input string to the specified maximum length and appends an ellipsis (`...`)
 * if the string exceeds the maximum length. If the string is shorter than or equal to the
 * maximum length, it is returned unchanged.
 *
 * Unlike the `truncate` function, the result can be truncated in the middle of a word
 *
 * @param {string} value - The input string to truncate.
 * @param {number} maxLength - The maximum allowed length for the string (default is 30).
 * @returns {string} - The truncated string with ellipsis (`...`) if necessary.
 *
 * @example
 * wrapText("This is a long string", 10); // Returns: "This is a..."
 * wrapText("Short text", 20); // Returns: "Short text"
 * wrapText("Another long string example", 15); // Returns: "Another long..."
 *
 * @group Strings
 */
export function wrapText(value: string, maxLength: number = 30) {
  if (value.length > maxLength) {
    return value.slice(0, maxLength) + '...';
  }

  return value;
}
