import { expect, test } from 'vitest';
import { formatMoney } from './formatMoney';

test('formatMoney (defaults)', () => {
  expect(formatMoney(100500)).toBe('$100,500');
});

test('formatMoney (custom format)', () => {
  expect(
    formatMoney(100500.36, { decimal: ' | ', thousands: '_', symbol: 'BTC' }),
  ).toBe('100_500 | 36BTC');
});

test('formatMoney (intMode)', () => {
  expect(formatMoney(1599, 'USD', true)).toBe('$15.99');
});
