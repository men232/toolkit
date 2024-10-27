/**
 * Escape regexp to safely use inside pattern
 *
 * @example
 * escapeRegExp('[a|b]'); // '\\[a\\|b\\]'
 *
 * @example
 * const searchTerms = 'Andrew L.';
 * const searchReg = new RegExp(escapeRegExp(searchTerms), 'i');
 *
 * const searchResult = users.find(v => searchReg.test(v.name))
 *
 * @group Strings
 */
export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
