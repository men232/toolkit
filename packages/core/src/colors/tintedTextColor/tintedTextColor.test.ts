import { describe, expect, test } from 'vitest';
import { tintedTextColor } from './tintedTextColor';

describe('tintedTextColor', () => {
  test('basic', () => {
    expect(tintedTextColor('rgb(255, 255, 255)', 1)).toStrictEqual([
      0, 0, 0, 1,
    ]);
  });
});
