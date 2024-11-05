import { describe, expect, test } from 'vitest';
import { escapeHtml } from './escapeHtml';

describe('convertToUnit', () => {
  test('defaults', () => {
    expect(escapeHtml('<b>Hello</b>')).toBe('&lt;b&gt;Hello&lt;/b&gt;');
  });
});
