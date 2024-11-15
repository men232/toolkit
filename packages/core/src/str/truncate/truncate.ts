/**
 * Truncates a string to the specified maximum length while preserving whole words
 * and appends ellipsis (`...`) if the string exceeds the maximum length.
 * Ensures that truncation does not occur if the difference is insignificant
 * (less than 5% of the original string length).
 *
 * @param {string} str - The input string to truncate.
 * @param {number} maxLength - The maximum allowed length for the string.
 * @param {number} insignificantThreshold - The insignificance threshold as a fraction of the original string length (default is 5%)
 * @returns {string} - The truncated string with ellipsis if applicable.
 *
 *
 * @example
 * // Basic truncation
 * truncate("This is a test string for truncation.", 20);
 * // Returns: "This is a test..."
 *
 * @example
 * // No truncation needed as the string length is within the limit
 * truncate("Short string", 20);
 * // Returns: "Short string"
 *
 * @example
 * // No truncation because the difference is insignificant
 * truncate("This string has an insignificant truncation.", 40);
 * // Returns: "This string has an insignificant truncation."
 *
 * @example
 * // Handles strings with no spaces gracefully
 * truncate("ThisStringHasNoSpacesButIsVeryLong", 10);
 * // Returns: "ThisString..."
 *
 * @group Strings
 */
export function truncate(
  value: string,
  maxLength: number = 120,
  insignificantThreshold: number = 0.05,
): string {
  if (!shouldTruncate(value, maxLength, insignificantThreshold)) {
    return value;
  }

  let truncated = value.slice(0, maxLength).trim();
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    truncated = truncated.slice(0, lastSpace);
  }

  return `${truncated}...`;
}

function shouldTruncate(
  text: string,
  maxLength: number,
  insignificantThreshold: number,
) {
  return text.length - maxLength > maxLength * insignificantThreshold;
}
