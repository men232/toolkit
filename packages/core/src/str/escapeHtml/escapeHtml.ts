const ESCAPE_RE = /["'&<>]/;

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
 * @replaces `str.replace(/&/g, '&amp;').replace(/</g, '&lt;')...` — hand-written chains often miss `"` or `'`
 * or escape `&` after the other entities; `escapeHtml` escapes all five characters in one pass.
 * @detect `\.replace\(/&/g,\s*['"]&amp;['"]\)`
 * @detect `\.replace\(/</g,\s*['"]&lt;['"]\)`
 *
 * @group Strings
 */
export function escapeHtml(unsafe: string) {
  if (typeof unsafe !== 'string') {
    return '';
  }

  var match = ESCAPE_RE.exec(unsafe);

  if (match === null) return unsafe;

  var result = '',
    last = 0,
    len = unsafe.length,
    escaped;

  for (var i = match.index; i < len; i++) {
    switch (unsafe.charCodeAt(i)) {
      case 34:
        escaped = '&quot;';
        break;
      case 38:
        escaped = '&amp;';
        break;
      case 39:
        escaped = '&#39;';
        break;
      case 60:
        escaped = '&lt;';
        break;
      case 62:
        escaped = '&gt;';
        break;
      default:
        continue;
    }

    if (last !== i) result += unsafe.slice(last, i);
    result += escaped;
    last = i + 1;
  }

  return last !== len ? result + unsafe.slice(last) : result;
}
