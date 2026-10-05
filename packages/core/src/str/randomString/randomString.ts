var DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
var DEFAULT_ALPHABET_LENGTH = DEFAULT_ALPHABET.length;

/**
 * Generates a random string of the specified length using characters from the given alphabet.
 * By default the alphabet is lowercase letters (a-z) and digits (0-9).
 *
 * @param {number} length - The length of the random string to generate. Fractional values are floored.
 * @param {string} [alphabet='abcdefghijklmnopqrstuvwxyz0123456789'] - Characters to pick from.
 *
 * @returns {string} A random string of the specified length, or an empty string for an empty alphabet.
 *
 * @example
 * randomString(8);  // e.g. 'a1b2c3d4'
 * randomString(12); // e.g. '3f6g7h8i9j0k'
 * randomString(6, '0123456789'); // e.g. '402817'
 * randomString(4, 'AB'); // e.g. 'ABBA'
 *
 * @group Strings
 */
export function randomString(length: number, alphabet?: string): string {
  var str = '';
  var num = Number.isFinite(length) ? Math.max(0, Math.floor(length)) : 0;

  if (alphabet === undefined) {
    while (num--) {
      str += DEFAULT_ALPHABET[(DEFAULT_ALPHABET_LENGTH * Math.random()) | 0];
    }

    return str;
  }

  const size = alphabet.length;

  if (size === 0) return str;

  while (num--) {
    str += alphabet[(size * Math.random()) | 0];
  }

  return str;
}
