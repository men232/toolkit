import { expect, test } from 'vitest';
import { has } from './has';

test('has', () => {
  const obj = {
    id: 1,
    details: undefined,
  };

  expect(has(obj, ['details'])).toBe(true);
});

test('has (multi - all exists)', () => {
  const obj = {
    id: 1,
    details: undefined,
  };

  expect(has(obj, ['details', 'id'])).toBe(true);
});

test('has (multi - one exists)', () => {
  const obj = {
    id: 1,
    details: undefined,
  };

  expect(has(obj, ['id', 'name'])).toBe(false);
});
