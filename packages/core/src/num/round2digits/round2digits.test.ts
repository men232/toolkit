import { describe, expect, test } from 'vitest';
import { round2digits } from './round2digits';

describe('round2digits', () => {
  test('defaults', () => {
    expect(round2digits(3.3333333)).toBe(3.33);
  });

  test('4 dights', () => {
    expect(round2digits(3.3333333, 4)).toBe(3.3333);
  });
});
