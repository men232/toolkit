import { expect, test } from 'vitest';
import { sprintf } from './sprintf';

test('sprintf (%s)', () => {
  expect(sprintf('Hello %s?', ['World'])).toBe('Hello World?');
});

test('sprintf (%d)', () => {
  expect(sprintf('count: %d', [15])).toBe('count: 15');
});

test('sprintf (%i)', () => {
  expect(sprintf('factor: %i', [3.25])).toBe('factor: 3');
});

test('sprintf (%o)', () => {
  expect(sprintf('user: %o', [{ name: 'andrew' }])).toBe(
    'user: {"name":"andrew"}',
  );
});

test('sprintf (%o - fn)', () => {
  expect(sprintf('fn: %o', [sprintf])).toBe('fn: sprintf');
});

test('sprintf (%o - str)', () => {
  expect(sprintf('fn: %o', ['sprintf'])).toBe("fn: 'sprintf'");
});

test('sprintf (leftArgs)', () => {
  const leftArgs: any[] = [];

  sprintf('fn: %o', ['sprintf', 'a', 'b', 'c'], leftArgs);

  expect(leftArgs).toStrictEqual(['a', 'b', 'c']);
});
