import { getWords } from '../getWords';

/**
 * Converts a string to snake case.
 *
 * Snake case is the naming convention in which each word is written in lowercase and separated by an underscore (_) character.
 *
 * @param {string} str - The string that is to be changed to snake case.
 * @returns {string} - The converted string to snake case.
 *
 * @example
 * const convertedStr1 = snakeCase('camelCase') // returns 'camel_case'
 * const convertedStr2 = snakeCase('some whitespace') // returns 'some_whitespace'
 * const convertedStr3 = snakeCase('hyphen-text') // returns 'hyphen_text'
 * const convertedStr4 = snakeCase('HTTPRequest') // returns 'http_request'
 *
 * @replaces `str.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()` — the two-group regex does not split
 * acronym runs (`HTTPRequest` → `httprequest`) and leaves spaces and `-` in place; `snakeCase` splits on case,
 * digits and any separator (`getHTTPResponseCode` → `get_http_response_code`).
 * @detect `\.replace\(/\(\[a-z[^\]\n]*\]\)\(\[A-Z\]\)/g,\s*['"]\$1_\$2['"]\)`
 * @detect `\.replace\(/\(?\[A-Z\]\)?/g,\s*\(?\w+\)?\s*=>\s*(['"]_['"]\s*\+|\x60_\$\{)`
 *
 * @group Strings
 */
export const snakeCase = (str?: string): string => {
  return getWords(str)
    .map(word => word.toLowerCase())
    .join('_');
};
