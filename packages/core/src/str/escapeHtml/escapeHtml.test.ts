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
});
