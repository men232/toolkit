/**
 * Escape string to regexp pattern
 *
 * @group Strings
 */
export function escapeRegExp(str: string) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
