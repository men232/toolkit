const htmlEscapes: Record<number, string> = Object.freeze({
  38: '&amp;', // &
  60: '&lt;', // <
  62: '&gt;', // >
  34: '&quot;', // "
  39: '&#39;', // '
});

/**
 * Sanitizes a string by escaping HTML syntax to prevent XSS (Cross-site scripting) attacks.
 * Converts special HTML characters like `<`, `>`, `&`, etc., into their corresponding HTML entities.
 *
 * @example
 * // Escaping HTML tags to prevent HTML injection
 * escapeHtml('<b>Strong</b> man.'); // '&lt;b&gt;Strong&lt;/b&gt; man.'
 *
 * // Escaping other HTML special characters
 * escapeHtml('<script>alert("XSS")</script>'); // '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;'
 *
 * @param unsafe - The string to be sanitized (escaped).
 * @returns A sanitized string with HTML special characters replaced by their corresponding HTML entities.
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
