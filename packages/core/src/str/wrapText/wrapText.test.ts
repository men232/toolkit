import { describe, expect, it } from 'vitest';
import { wrapText } from './wrapText';

describe('wrapText', () => {
  it('should truncate a long string and add ellipsis', () => {
    expect(wrapText('This is a long string', 10)).toBe('This is a ...');
    expect(wrapText('Another long string example', 15)).toBe(
      'Another long st...',
    );
  });

  it("should return the string unchanged if it's shorter than maxLength", () => {
    expect(wrapText('Short text', 20)).toBe('Short text');
    expect(wrapText('Hello', 10)).toBe('Hello');
  });

  it("should return the string unchanged if it's exactly the maxLength", () => {
    expect(wrapText('Exact length', 12)).toBe('Exact length');
  });

  it('should handle empty strings correctly', () => {
    expect(wrapText('', 10)).toBe('');
    expect(wrapText('', 0)).toBe('');
  });
});
