import { describe, expect, test } from 'vitest';
import { maskingPhone } from './maskingPhone';

describe('maskingPhone', () => {
  test('not formatted', () => {
    expect(maskingPhone('+18000551100')).toBe('+18XXXXX1100');
  });

  test('formatted', () => {
    expect(maskingPhone('+1 800-055-1100')).toBe('+1 8XX-XXX-1100');
  });

  test('custom range', () => {
    expect(maskingPhone('+1 800-055-1100', 4, 3)).toBe('+1 800-XXX-X100');
  });

  test('poor', () => {
    expect(maskingPhone('+1800')).toBe('+18XX');
    expect(maskingPhone('+180')).toBe('+18X');
    expect(maskingPhone('+18')).toBe('+18');
  });
});
