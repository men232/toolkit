import { expect, test } from 'vitest';
import { round2digits } from './round2digits';

test('round2digits (defaults)', () => {
  expect(round2digits(3.3333333)).toBe(3.33);
});

test('round2digits (4 dights)', () => {
  expect(round2digits(3.3333333, 4)).toBe(3.3333);
});
