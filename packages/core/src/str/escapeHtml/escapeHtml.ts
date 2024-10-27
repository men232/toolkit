/**
 * Sanitize a string to escape html syntax
 *
 * @example
 * escapeHtml('<b>Strong</b> man.') // '&lt;b&gt;Strong&lt;/&gt; man.'
 *
 * @group Strings
 */
export function escapeHtml(unsafe: string) {
  if (typeof unsafe !== 'string') {
    return '';
  }

  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
