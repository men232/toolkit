import { describe, expect, test } from 'vitest';
import { buildCssColor } from './buildCssColor';

describe('buildCssColor', () => {
  test('color channels to rgba', () => {
    expect(buildCssColor([255, 200, 100, 1])).toBe('rgba(255, 200, 100, 1)');
  });

  test('color channels to rgba with custom alpha', () => {
    expect(buildCssColor([255, 200, 100, 0.5], 0.1)).toBe(
      'rgba(255, 200, 100, 0.05)',
    );
  });
});
