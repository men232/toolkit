import { describe, expect, test } from 'vitest';
import { humanFileSize } from './humanFileSize';

describe('humanFileSize', () => {
  test('defaults', () => {
    expect(humanFileSize(6432)).toBe('6.3 KB');
  });

  test('2 dights', () => {
    expect(humanFileSize(6432, 2)).toBe('6.28 KB');
  });

  test('no spaces', () => {
    expect(humanFileSize(6432, 1, false)).toBe('6.3KB');
  });
  test('withSpace applies to values under 1 KB', () => {
    expect(humanFileSize(500, 1, false)).toBe('0.5KB');
    expect(humanFileSize(500, 1, true)).toBe('0.5 KB');
  });
});
