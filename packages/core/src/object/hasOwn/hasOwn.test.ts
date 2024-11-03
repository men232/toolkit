import { expect, test } from 'vitest';
import { hasOwn } from './hasOwn';

test('hasOwn (exists)', () => {
  const obj = {
    id: 1,
    details: undefined,
  };

  expect(hasOwn(obj, 'details')).toBe(true);
});

test('hasOwn (not exists)', () => {
  const obj = {
    id: 1,
    details: undefined,
  };

  expect(hasOwn(obj as any, 'name')).toBe(false);
});
