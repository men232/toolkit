import { TWEMOJI_REGEX } from '../twemojiRegex';

/**
 * Checks if the provided text is a single emoji.
 * The function uses a regular expression to match the emoji and ensures that the entire string is a valid single emoji.
 *
 * @param {unknown} text - The input value to check.
 * @returns {boolean} - Returns `true` if the input is a single emoji, otherwise `false`.
 *
 * @example
 * isOneEmoji("😊"); // Returns: true
 * isOneEmoji("Hello 😊"); // Returns: false
 * isOneEmoji("😎"); // Returns: true
 * isOneEmoji("👨‍👩‍👧‍👦"); // Returns: true (family emoji with multiple characters)
 * isOneEmoji("not an emoji"); // Returns: false
 *
 * @group Strings
 */
export function isOneEmoji(text: unknown): text is string {
  return !!(
    typeof text === 'string' &&
    text &&
    (text.match(TWEMOJI_REGEX) || [])[0]?.length === text.length
  );
}
