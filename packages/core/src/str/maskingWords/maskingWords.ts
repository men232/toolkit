import { getWords } from '../getWords';

/**
 * Masks the middle characters of each word in the given string, leaving the first and last characters intact.
 * The characters in the middle of each word are replaced by a specified masking character (default is `*`).
 *
 * ⚠️ If the provided value is not a valid string, the function returns an empty string.
 *
 * **Note**: This function does not perform any validation or checks for non-alphabetic characters within words.
 * It simply masks all characters between the first and last character of each word.
 *
 * @param {string} value - The input string containing words to be masked.
 * @param {string} [withChar='*'] - The character used to replace the middle characters of each word. Default is `*`.
 *
 * @returns {string} The input string with middle characters of words masked, or an empty string if the input is invalid.
 *
 * @example
 * maskingWords('hello world'); // 'h**o w**d'
 * maskingWords('John Doe');    // 'J**n D**e'
 * maskingWords('a b c');       // '* * *'
 *
 * @group Strings
 */
export function maskingWords(value: string, withChar = '*'): string {
  return getWords(value)
    .map(word => {
      const len = word.length;

      if (len < 2) {
        return ''.padEnd(len, withChar);
      } else if (len < 3) {
        return word[0].padEnd(len, withChar);
      } else {
        return word[0].padEnd(len - 2, withChar) + word.at(-1);
      }
    })
    .join(' ');
}
