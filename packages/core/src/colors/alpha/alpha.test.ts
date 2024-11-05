import { describe, expect, test } from 'vitest';
import { alpha } from './alpha';

describe('alpha', () => {
  test('adjust rgba', () => {
    expect(alpha('rgba(255, 255, 255, 0.5)', 1)).toBe('rgba(255, 255, 255, 1)');
  });
});
