import { describe, expect, it } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('escapeHtml', () => {
  let escaped = '&amp;&lt;&gt;&quot;&#39;/';
  let unescaped = '&<>"\'/';

  escaped += escaped;
  unescaped += unescaped;

  it('should escape values', () => {
    expect(escapeHtml(unescaped)).toBe(escaped);
  });

  it('should handle strings with nothing to escape', () => {
    expect(escapeHtml('abc')).toBe('abc');
  });

  ['`', '/'].forEach(chr => {
    it(`should not escape the "${chr}" character`, () => {
      expect(escapeHtml(chr)).toBe(chr);
    });
  });

  it('should match a per-character reference on mixed input', () => {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    const alphabet = ['a', ' ', '&', '<', '>', '"', "'", '😀', '\uD800', 'é'];

    for (let n = 0; n < 200; n++) {
      let input = '';
      const len = n % 20;
      for (let i = 0; i < len; i++) {
        input += alphabet[(Math.random() * alphabet.length) | 0];
      }

      let expected = '';
      for (let i = 0; i < input.length; i++) {
        expected += map[input[i]] ?? input[i];
      }

      expect(escapeHtml(input)).toBe(expected);
    }
  });
});
