import { describe, expect, test } from 'vitest';
import { avg } from './avg';

describe('avg', () => {
  test('result of valid numbers', () => {
    expect(avg([5, 5, 5])).toBe(5);
  });

  test('empty returns)', () => {
    expect(avg([])).toBe(0);
  });
});
