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
 * @replaces `str.replace(/\b\w/g, c => c.toUpperCase())` — `\b\w` is ASCII-only and leaves `foo_bar` and
 * `fooBar` unsplit; `startCase` splits case, `-` and `_` and capitalizes each word. Caveat: it lowercases the
 * rest of each word (`HELLO` → `Hello`) and splits on apostrophes (`don't` → `Don T`).
 * @detect `\.replace\(/\\b\\w/g,`
 * @detect `\.replace\(/\(\[a-z[^\]\n]*\]\)\(\[A-Z\]\)/g,\s*['"]\$1 \$2['"]\)`
 * @detect `\.split\(['"] ['"]\)\s*\.map\(\s*\(?\w+\)?\s*=>\s*\w+(\[0\]|\.charAt\(0\))\.toUpperCase\(\)\s*\+\s*\w+\.(slice|substring|substr)\(1\)`
 *
 * @group Strings
 */
export const startCase = (value?: string): string => {
  return getWords(value).map(capitalize).join(' ');
};
