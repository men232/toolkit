import { expect, test } from 'vitest';
import { timestamp } from './timestamp';

test('timestamp (from number)', () => {
  expect(timestamp(1730642875273)).toBe(1730642875);
});

test('timestamp (from date)', () => {
  expect(timestamp(new Date(0))).toBe(0);
});
