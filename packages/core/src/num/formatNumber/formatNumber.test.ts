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
});
