import { describe, expect, test } from 'vitest';
import { getFileExtension } from './getFileExtension';

describe('getFileExtension', () => {
  test('from full name', () => {
    expect(getFileExtension('Linkin Park - Faint.mp3')).toBe('.mp3');
  });

  test('from url', () => {
    expect(
      getFileExtension(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
      ),
    ).toBe('.mp3');
  });
});
