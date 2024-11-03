import { expect, test } from 'vitest';
import { clamp } from './clamp';

test('clamp (min)', () => {
  expect(clamp(-5, 0, 10)).toBe(0);
});

test('clamp (max)', () => {
  expect(clamp(15, 0, 10)).toBe(10);
});
