import { isString } from '@/is';
import { isOneEmoji } from '../isOneEmoji';

const IGNORED_TITLES = Object.freeze(
  new Set([
    'dr.',
    'mr.',
    'mrs.',
    'miss',
    'ms.',
    'prof.',
    'sir',
    'rev.',
    'hon.',
  ]),
);

/**
 * Extracts the initials from a full name while ignoring titles or prefixes (e.g., Dr., Mr., Mrs.),
 * as well as any words starting with special characters (e.g., !, @, #).
 * Handles names with multiple words, ignores special characters, and ensures proper handling of Unicode characters.
 *
 * @param {string} fullName - The full name from which to extract initials.
 * @returns {string} - The extracted initials in uppercase, or an empty string if the input is invalid.
 *
 * @example
 * getInitials("John Doe");
 * // Returns: "JD"
 *
 * @example
 * getInitials("Dr. Alice Wonderland");
 * // Returns: "AW"
 *
 * @example
 * getInitials("José María de la Cruz");
 * // Returns: "JC"
 *
 * @example
 * getInitials("Mr. Albert Einstein");
 * // Returns: "AE"
 *
 * @example
 * getInitials("Invalid Name");
 * // Returns: "IN"
 *
 * @example
 * getInitials("");
 * // Returns: ""
 *
 * @group Strings
 */
export function getInitials(fullName: string) {
  if (!isString(fullName)) return '';

  let [first, ...rest] = fullName
    .replace(/\s{2,}/g, ' ')
    .replace(/[,+/#!$@%^&*;:{}=\-_`~()]/g, '')
    .trim()
    .split(' ')
    .filter(word => !IGNORED_TITLES.has(word.toLowerCase()))
    .map(v => v.replaceAll('.', '').trim())
    .filter(Boolean);

  let last = rest[rest.length - 1];

  if (rest.length > 1) {
    if (isOneEmoji(first)) {
      first = rest[0];
    } else if (isOneEmoji(last)) {
      last = rest[0];
    }
  }

  return [first, last]
    .filter(Boolean)
    .map((letter = '') => [...letter.toUpperCase()][0]) // We use the spread operator to support Unicode characters
    .join('');
}
