/**
 * Converts a two-letter ISO country code (e.g., 'US') to the corresponding flag emoji.
 * If the input is not a valid two-letter country code, it returns the original string.
 *
 * @param {string} iso - The two-letter ISO country code.
 * @returns {string} - The corresponding country flag emoji or the original input if it's invalid.
 *
 * @example
 * isoToFlagEmoji("US"); // Returns: 🇺🇸
 * isoToFlagEmoji("GB"); // Returns: 🇬🇧
 * isoToFlagEmoji("DE"); // Returns: 🇩🇪
 * isoToFlagEmoji("xyz"); // Returns: "xyz" (invalid code)
 *
 * @group Strings
 */
export function isoToFlagEmoji(iso: string) {
  const code = iso.toUpperCase();

  if (!/^[A-Z]{2}$/.test(code)) return iso;
  const codePoints = [...code].map(c => c.codePointAt(0)! + 127397);
  return String.fromCodePoint(...codePoints);
}
