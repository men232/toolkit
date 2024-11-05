const htmlEscapes: Record<number, string> = Object.freeze({
  38: '&amp;', // &
  60: '&lt;', // <
  62: '&gt;', // >
  34: '&quot;', // "
  39: '&#39;', // '
});

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

  let result = '';
  let strLen = unsafe.length;
  let char: number;

  for (let idx = 0; idx < strLen; idx++) {
    char = unsafe.charCodeAt(idx);
    result += htmlEscapes[char] || String.fromCharCode(char);
  }

  return result;
}
