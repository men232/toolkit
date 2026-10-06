import { describe, expect, test } from 'vitest';
import { formatMoney } from './formatMoney';

describe('formatMoney', () => {
  test('defaults', () => {
    expect(formatMoney(100500)).toBe('$100,500');
  });

  test('custom format', () => {
    expect(
      formatMoney(100500.36, { decimal: ' | ', thousands: '_', symbol: 'BTC' }),
    ).toBe('100_500 | 36BTC');
  });

  test('intMode', () => {
    expect(formatMoney(1599, 'USD', true)).toBe('$15.99');
  });
  test('currencies without minor units are rounded', () => {
    expect(formatMoney(12.5, 'JPY')).toBe('¥13');
    expect(formatMoney(1234.4, 'KRW')).toBe('₩1,234');
  });

  test('negative amounts put the sign before the symbol', () => {
    expect(formatMoney(-5, 'USD')).toBe('-$5');
    expect(formatMoney(-1234.5, 'EUR')).toBe('-€1.234,50');
    expect(formatMoney(-1500, 'RUB')).toBe('-1 500₽');
    expect(formatMoney(-0.004, 'USD')).toBe('$0');
  });
  test('UAH puts the symbol after the amount', () => {
    expect(formatMoney(1500.5, 'UAH')).toBe('1 500,50₴');
  });
  test('unknown currency code uses a dot as the decimal separator', () => {
    expect(formatMoney(12.5, 'XYZ')).toBe('12.50XYZ');
    expect(formatMoney(1234.5, 'XYZ')).toBe('1,234.50XYZ');
  });
});
