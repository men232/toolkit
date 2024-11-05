import { describe, expect, test } from 'vitest';
import { clamp } from './clamp';

describe('clamp', () => {
  test('min', () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });

  test('max', () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });

  test('invalid value', () => {
    expect(clamp('test' as any, 0, 10)).toBe(0);
  });
});
