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
});
