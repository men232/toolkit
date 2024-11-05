import { describe, expect, test } from 'vitest';
import { getFileName } from './getFileName';

describe('getFileName', () => {
  test('from full name', () => {
    expect(getFileName('Linkin Park - Faint.mp3')).toBe('Linkin Park - Faint');
  });

  test('from url', () => {
    expect(
      getFileName(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
      ),
    ).toBe('Linkin Park - Faint');
  });
});
