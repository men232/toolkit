import { expect, test } from 'vitest';
import { formatNumber } from './formatNumber';

test('formatNumber (defaults)', () => {
  expect(formatNumber(100500)).toBe('100,500');
});

test('formatNumber (custom format)', () => {
  expect(formatNumber(100500.99, { decimal: '|', thousands: '_' })).toBe(
    '100_500|99',
  );
});
