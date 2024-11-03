import { expect, test } from 'vitest';
import { parsePercentage } from './parsePercentage';

test('parsePercentage (str)', () => {
  expect(parsePercentage('99%')).toBe(99);
});

test('parsePercentage (number)', () => {
  expect(parsePercentage(99)).toBe(99);
});

test('parsePercentage (decimal)', () => {
  expect(parsePercentage(99.53)).toBe(99.53);
});

test('parsePercentage (> 100)', () => {
  expect(parsePercentage(199.53)).toBe(100);
});

test('parsePercentage (< 0)', () => {
  expect(parsePercentage(-25)).toBe(0);
});
