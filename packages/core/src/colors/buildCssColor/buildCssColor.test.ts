import { expect, test } from 'vitest';
import { buildCssColor } from './buildCssColor';

test('buildCssColor', () => {
  expect(buildCssColor([255, 200, 100, 1])).toBe('rgba(255, 200, 100, 1)');
});

test('buildCssColor (custom alpha)', () => {
  expect(buildCssColor([255, 200, 100, 0.5], 0.1)).toBe(
    'rgba(255, 200, 100, 0.05)',
  );
});
