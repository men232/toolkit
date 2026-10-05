import { describe, expect, test } from 'vitest';
import { formatNumber } from './formatNumber';

describe('formatNumber', () => {
  test('defaults', () => {
    expect(formatNumber(100500)).toBe('100,500');
  });

  test('custom format', () => {
    expect(formatNumber(100500.99, { decimal: '|', thousands: '_' })).toBe(
      '100_500|99',
    );
  });

  test('invalid value', () => {
    expect(formatNumber('test', { decimal: '|', thousands: '_' })).toBe('');
  });
  test('numbers from 1e21 are not printed in exponent notation', () => {
    expect(formatNumber(1e21)).toBe('1,000,000,000,000,000,000,000');
    expect(formatNumber(-1.5e22)).toBe('-15,000,000,000,000,000,000,000');
  });

  test('infinity', () => {
    expect(formatNumber(Infinity)).toBe('');
    expect(formatNumber(-Infinity)).toBe('');
  });

  test('negative value rounded to zero', () => {
    expect(formatNumber(-0.004)).toBe('0');
  });
});
