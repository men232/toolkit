import { getWords } from '../getWords';

/**
 * Pretty simple words masking.
 *
 * ⚠️ Returns empty string when invalid value passed.
 *
 * @example
 * maskingWords('hello world'); // 'h**o w**d'
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
