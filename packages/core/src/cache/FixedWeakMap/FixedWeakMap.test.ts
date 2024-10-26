import { expect, test } from 'vitest';
import { FixedWeakMap } from './FixedWeakMap';

test('FixedWeakMap', () => {
  const map = new FixedWeakMap<object, any>(3);

  const key_1 = {};
  const key_2 = {};
  const key_3 = {};
  const key_4 = {};
  const key_5 = {};
  const key_6 = {};

  const entries: [object, string][] = [
    [key_1, 'value_1'],
    [key_2, 'value_2'],
    [key_3, 'value_3'],
    [key_4, 'value_4'],
    [key_5, 'value_5'],
  ];

  for (const [key, value] of entries) {
    map.set(key, value);
  }

  expect(map.size).toBe(3);

  // un exists key must returns undefined
  expect(map.get({})).toBe(undefined);

  // exists key must returns value
  expect(map.get(key_3)).toBe('value_3');

  // removing un exists key must returns false
  expect(map.delete({})).toBe(false);

  // removing exists key must returns true
  expect(map.delete(key_3)).toBe(true);

  // success removing mast affect size
  expect(map.size).toBe(2);

  // set must removes first key when overfull
  map.set(key_6, 6);
  expect(map.get(key_3)).toBe(undefined);

  // after set size must be the same
  expect(map.size).toBe(3);

  // has un existed key must returns false
  expect(map.has(key_3)).toBe(false);

  // has existed key must returns true
  expect(map.has(key_4)).toBe(true);

  // clear must removes all entries
  map.clear();

  expect(map.size).toBe(0);
});
