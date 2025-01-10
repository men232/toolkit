import { isNumber } from '@/is';

const rndCharacters = 'abcdefghijklmnopqrstuvwxyz0123456789';
const charactersLength = rndCharacters.length;

/**
 * Generates a random string of the specified length using characters from a predefined set.
 * The characters used in the generated string include lowercase letters (a-z) and digits (0-9).
 *
 * @param {number} length - The length of the random string to generate. Must be a positive integer.
 *
 * @returns {string} A random string of the specified length, composed of characters from 'a-z' and '0-9'.
 *
 * @example
 * randomString(8);  // e.g. 'a1b2c3d4'
 * randomString(12); // e.g. '3f6g7h8i9j0k'
 * randomString(5);  // e.g. '1a2b3'
 *
 * @group Strings
 */
export function randomString(length: number): string {
  let str = '';
  let num = isNumber(length) ? Math.max(0, length) : 0;
  while (num--) {
    str += rndCharacters[(charactersLength * Math.random()) | 0];
  }
  return str;
}
