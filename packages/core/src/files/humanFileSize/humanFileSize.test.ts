import { expect, test } from 'vitest';
import { humanFileSize } from './humanFileSize';

test('humanFileSize (defaults)', () => {
  expect(humanFileSize(6432)).toBe('6.3 KB');
});

test('humanFileSize (2 dights)', () => {
  expect(humanFileSize(6432, 2)).toBe('6.28 KB');
});

test('humanFileSize (no spaces)', () => {
  expect(humanFileSize(6432, 1, false)).toBe('6.3KB');
});
