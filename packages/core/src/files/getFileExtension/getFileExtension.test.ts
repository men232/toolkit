import { expect, test } from 'vitest';
import { getFileExtension } from './getFileExtension';

test('getFileExtension (from full name)', () => {
  expect(getFileExtension('Linkin Park - Faint.mp3')).toBe('.mp3');
});

test('getFileExtension (from url)', () => {
  expect(
    getFileExtension(
      'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
    ),
  ).toBe('.mp3');
});
