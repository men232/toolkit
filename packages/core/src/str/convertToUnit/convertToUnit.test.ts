import { describe, expect, test } from 'vitest';
import { convertToUnit } from './convertToUnit';

describe('convertToUnit', () => {
  test('defaults', () => {
    expect(convertToUnit(10)).toBe('10px');
  });

  test('px', () => {
    expect(convertToUnit(10, 'px')).toBe('10px');
  });

  test('string', () => {
    expect(convertToUnit('10px', 'px')).toBe('10px');
  });

  test('invalid', () => {
    expect(convertToUnit(NaN, 'px')).toBe('NaN');
  });
});
