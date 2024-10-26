import { expect, test } from 'vitest';
import { tintedTextColor } from './tintedTextColor';

test('tintedTextColor', () => {
  expect(tintedTextColor('rgb(255, 255, 255)', 1)).toStrictEqual([0, 0, 0, 1]);
});
