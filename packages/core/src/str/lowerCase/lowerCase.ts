import { getWords } from '../getWords';

/**
 * Converts a string to lower case.
 *
 * Lower case is the naming convention in which each word is written in lowercase and separated by an space ( ) character.
 *
 * @param {string} str - The string that is to be changed to lower case.
 * @returns {string} - The converted string to lower case.
 *
 * @example
 * const convertedStr1 = lowerCase('camelCase') // returns 'camel case'
 * const convertedStr2 = lowerCase('some whitespace') // returns 'some whitespace'
 * const convertedStr3 = lowerCase('hyphen-text') // returns 'hyphen text'
 * const convertedStr4 = lowerCase('HTTPRequest') // returns 'http request'
 *
 * @replaces `str.replace(/([A-Z])/g, ' $1').toLowerCase().trim()` — the regex splits every capital
 * (`HTTPRequest` → `h t t p request`) and keeps `-`/`_`; `lowerCase` keeps acronyms together and joins words
 * with single spaces (`getHTTPResponse` → `get http response`).
 * @detect `\.replace\(/\(\[A-Z\]\)/g,\s*['"] \$1['"]\)[^;]{0,80}\.toLowerCase\(\)`
 *
 * @group Strings
 */
export const lowerCase = (str?: string): string => {
  return getWords(str)
    .map(word => word.toLowerCase())
    .join(' ');
};
