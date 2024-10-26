import { expect, test } from 'vitest';
import { FixedMap } from './FixedMap';

test('FixedMap', () => {
  const map = new FixedMap(3);

  const entries = [
    ['key_1', 1],
    ['key_2', 2],
    ['key_3', 3],
    ['key_4', 4],
    ['key_5', 5],
  ];

  for (const [key, value] of entries) {
    map.set(key, value);
  }

  expect(map.size).toBe(3);

  // keys must returns last 3 entries
  expect(Array.from(map.keys())).toStrictEqual(
    entries.slice(-3).map(([key]) => key),
  );

  // values must returns last 3 entries
  expect(Array.from(map.values())).toStrictEqual(
    entries.slice(-3).map(([_, value]) => value),
  );

  // entries must returns last 3 entries
  expect(Array.from(map.entries())).toStrictEqual(entries.slice(-3));

  // for each must iterates over all entries
  const forEachEntries: any[] = [];

  map.forEach((value, key) => {
    forEachEntries.push([key, value]);
  });

  expect(forEachEntries).toStrictEqual(entries.slice(-3));

  // un exists key must returns undefined
  expect(map.get('key_2')).toBe(undefined);

  // exists key must returns value
  expect(map.get('key_3')).toBe(3);

  // removing un exists key must returns false
  expect(map.delete('key_2')).toBe(false);

  // removing exists key must returns true
  expect(map.delete('key_3')).toBe(true);

  // success removing mast affect size
  expect(map.size).toBe(2);

  // set must removes first key when overfull
  map.set('key_6', 6);
  expect(map.get('key_3')).toBe(undefined);

  // after set size must be the same
  expect(map.size).toBe(3);

  // has un existed key must returns false
  expect(map.has('key_3')).toBe(false);

  // has existed key must returns true
  expect(map.has('key_4')).toBe(true);

  // clear must removes all entries
  map.clear();

  expect(map.size).toBe(0);

  expect(Array.from(map.keys())).toStrictEqual([]);
});
