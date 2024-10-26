import { expect, test } from 'vitest';
import { alpha } from './alpha';

test('alpha', () => {
  expect(alpha('rgba(255, 255, 255, 0.5)', 1)).toBe('rgba(255, 255, 255, 1)');
});
