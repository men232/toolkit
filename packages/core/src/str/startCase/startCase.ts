import { capitalize } from '../capitalize';
import { getWords } from '../getWords';

/**
 * Converts the first character of each word in a string to uppercase and the remaining characters to lowercase.
 *
 * Start case is the naming convention in which each word is written with an initial capital letter.
 * @param {string} str - The string to convert.
 * @returns {string} The converted string.
 *
 * @example
 * const result1 = startCase('hello world');  // result will be 'Hello World'
 * const result2 = startCase('HELLO WORLD');  // result will be 'Hello World'
 * const result3 = startCase('hello-world');  // result will be 'Hello World'
 * const result4 = startCase('hello_world');  // result will be 'Hello World'
 *
 * @group Strings
 */
export const startCase = (value?: string): string => {
  return getWords(value).map(capitalize).join(' ');
};
