import { expect, test } from 'vitest';
import { humanize } from './humanize';

test('humanize (less then 1k)', () => {
  expect(humanize(512)).toBe('512');
});

test('humanize (1k)', () => {
  expect(humanize(1000)).toBe('1k');
  expect(humanize(1540)).toBe('1.5k');
  expect(humanize(1550, 2)).toBe('1.55k');
});

test('humanize (1M)', () => {
  expect(humanize(1000000)).toBe('1M');
  expect(humanize(1500000)).toBe('1.5M');
});

test('humanize (1B)', () => {
  expect(humanize(1000000000)).toBe('1B');
  expect(humanize(1500000000)).toBe('1.5B');
});

test('humanize (1T)', () => {
  expect(humanize(1000000000000)).toBe('1T');
  expect(humanize(1500000000000)).toBe('1.5T');
});
