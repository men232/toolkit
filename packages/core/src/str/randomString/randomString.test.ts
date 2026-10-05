import { describe, expect, test } from 'vitest';
import { randomString } from './randomString';

describe('randomString', () => {
  test('should handle length', () => {
    expect(randomString(15).length).toBe(15);
  });

  test('should handle invalid length', () => {
    expect(randomString(-5)).toBe('');
    expect(randomString('' as any)).toBe('');
    expect(randomString(null as any)).toBe('');
    expect(randomString(undefined as any)).toBe('');
    expect(randomString({} as any)).toBe('');
  });
  test('should floor a fractional length', () => {
    expect(randomString(2.5).length).toBe(2);
    expect(randomString(0.5)).toBe('');
  });

  test('should return an empty string for non-finite length', () => {
    expect(randomString(Infinity)).toBe('');
    expect(randomString(NaN)).toBe('');
  });
  test('should use a custom alphabet', () => {
    const value = randomString(200, 'ab');

    expect(value).toHaveLength(200);
    expect(value).toMatch(/^[ab]+$/);
  });

  test('should repeat a single-character alphabet', () => {
    expect(randomString(4, 'x')).toBe('xxxx');
  });

  test('should return an empty string for an empty alphabet', () => {
    expect(randomString(4, '')).toBe('');
  });
});
