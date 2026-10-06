/**
 * Escapes special characters in a string to safely use it as a literal pattern in a regular expression.
 * This function ensures that any characters that would otherwise have a special meaning in a regex
 * (such as `*`, `+`, `?`, etc.) are properly escaped, allowing them to be used as normal characters
 * in the pattern.
 *
 * @example
 * // Escapes special characters in the string '[a|b]'
 * escapeRegExp('[a|b]'); // '\\[a\\|b\\]'
 *
 * @example
 * // Use the function to safely create a regex from user input
 * const searchTerms = 'Andrew L.';
 * const searchReg = new RegExp(escapeRegExp(searchTerms), 'i');
 * const searchResult = users.find(v => searchReg.test(v.name));
 *
 * @param str - The string to escape for use in a regular expression.
 * @returns The input string with all special regex characters escaped.
 *
 * @replaces `str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` — copied versions often drop `-` or `/`, which break
 * a character class or a `/`-delimited source; `escapeRegExp` escapes both. On Node 24+ and current browsers
 * `RegExp.escape` is the native alternative.
 * @detect `\.replace\(/\[[^\n]*\]/g,\s*['"]\\\\\$&['"]\)`
 *
 * @group Strings
 */
export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
