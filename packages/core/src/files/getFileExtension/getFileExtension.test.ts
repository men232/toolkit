import { describe, expect, test } from 'vitest';
import { getFileExtension } from './getFileExtension';

describe('getFileExtension', () => {
  test('should handle full name', () => {
    expect(getFileExtension('Linkin Park - Faint.mp3')).toBe('.mp3');
  });

  test('should handle urls', () => {
    expect(
      getFileExtension(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
      ),
    ).toBe('.mp3');
  });

  test('should handle full name (without dot)', () => {
    expect(getFileExtension('Linkin Park - Faint.mp3', false)).toBe('mp3');
  });

  test('should handle urls (without dot)', () => {
    expect(
      getFileExtension(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
        false,
      ),
    ).toBe('mp3');
  });
});
