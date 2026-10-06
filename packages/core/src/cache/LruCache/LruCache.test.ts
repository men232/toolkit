import { describe, expect, test } from 'vitest';
import { LruCache } from './LruCache';

describe('LruCache', () => {
  test('evicts the least recently used entry', () => {
    const cache = new LruCache<string, number>(2);

    cache.set('a', 1).set('b', 2);
    cache.get('a');
    cache.set('c', 3);

    expect(cache.has('b')).toBe(false);
    expect(Array.from(cache.keys())).toEqual(['c', 'a']);
  });

  test('delete removes the entry', () => {
    const cache = new LruCache<string, number>(3);

    cache.set('a', 1).set('b', 2).set('c', 3);

    expect(cache.delete('b')).toBe(true);
    expect(cache.delete('b')).toBe(false);
    expect(cache.size).toBe(2);
    expect(cache.has('b')).toBe(false);
    expect(Array.from(cache.keys())).toEqual(['c', 'a']);
    expect(Array.from(cache.entries())).toEqual([
      ['c', 3],
      ['a', 1],
    ]);
  });

  test('delete frees the slot for a new entry', () => {
    const cache = new LruCache<string, number>(2);

    cache.set('a', 1).set('b', 2);
    cache.delete('b');
    cache.set('c', 3);

    expect(cache.size).toBe(2);
    expect(Array.from(cache.keys())).toEqual(['c', 'a']);

    cache.set('d', 4);

    expect(Array.from(cache.keys())).toEqual(['d', 'c']);
  });

  test.each(['a', 'b', 'c'])('keeps order after deleting %s', key => {
    const cache = new LruCache<string, number>(3);

    cache.set('a', 1).set('b', 2).set('c', 3);
    cache.delete(key);
    cache.set('d', 4).set('e', 5);

    const expected = ['e', 'd', ...['c', 'b', 'a'].filter(k => k !== key)];

    expect(Array.from(cache.keys())).toEqual(expected.slice(0, 3));
    expect(cache.size).toBe(3);
  });

  test('can be emptied by delete and reused', () => {
    const cache = new LruCache<string, number>(2);

    cache.set('a', 1).set('b', 2);
    cache.delete('a');
    cache.delete('b');

    expect(cache.size).toBe(0);
    expect(Array.from(cache.keys())).toEqual([]);

    cache.set('c', 3).set('d', 4).set('e', 5);

    expect(Array.from(cache.entries())).toEqual([
      ['e', 5],
      ['d', 4],
    ]);
  });

  test('has returns true for a stored undefined value', () => {
    const cache = new LruCache<string, undefined>(2);

    cache.set('a', undefined);

    expect(cache.has('a')).toBe(true);
    expect(Array.from(cache.keys())).toEqual(['a']);
  });

  test('clear resets deleted slots', () => {
    const cache = new LruCache<string, number>(2);

    cache.set('a', 1).set('b', 2);
    cache.delete('a');
    cache.clear();
    cache.set('c', 3).set('d', 4);

    expect(Array.from(cache.keys())).toEqual(['d', 'c']);
  });
});

describe('LruCache (mnemonist suite)', () => {
  test.each([0, -1, NaN, undefined, 'x'])(
    'should throw for an invalid capacity: %s',
    capacity => {
      expect(() => new LruCache(capacity as any)).toThrow(/capacity/);
    },
  );

  const entries = (cache: LruCache) => Array.from(cache.entries());

  test('should be possible to create a LRU cache', () => {
    const cache = new LruCache(3);

    cache.set('one', 1);
    cache.set('two', 2);

    expect(cache.size).toBe(2);
    expect(entries(cache)).toEqual([
      ['two', 2],
      ['one', 1],
    ]);

    cache.set('three', 3);

    expect(cache.size).toBe(3);
    expect(entries(cache)).toEqual([
      ['three', 3],
      ['two', 2],
      ['one', 1],
    ]);

    cache.set('four', 4);

    expect(cache.size).toBe(3);
    expect(entries(cache)).toEqual([
      ['four', 4],
      ['three', 3],
      ['two', 2],
    ]);

    cache.set('two', 5);
    expect(entries(cache)).toEqual([
      ['two', 5],
      ['four', 4],
      ['three', 3],
    ]);

    expect(cache.has('four')).toBe(true);
    expect(cache.has('one')).toBe(false);

    expect(cache.get('one')).toBe(undefined);
    expect(cache.get('four')).toBe(4);
    expect(entries(cache)).toEqual([
      ['four', 4],
      ['two', 5],
      ['three', 3],
    ]);

    expect(cache.get('three')).toBe(3);
    expect(entries(cache)).toEqual([
      ['three', 3],
      ['four', 4],
      ['two', 5],
    ]);

    expect(cache.get('three')).toBe(3);
    expect(entries(cache)).toEqual([
      ['three', 3],
      ['four', 4],
      ['two', 5],
    ]);

    expect(cache.peek('two')).toBe(5);
    expect(entries(cache)).toEqual([
      ['three', 3],
      ['four', 4],
      ['two', 5],
    ]);
  });

  test('should be possible to clear a LRU cache', () => {
    const cache = new LruCache(3);

    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('one', 3);

    expect(entries(cache)).toEqual([
      ['one', 3],
      ['two', 2],
    ]);

    expect(cache.get('two')).toBe(2);
    expect(entries(cache)).toEqual([
      ['two', 2],
      ['one', 3],
    ]);

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.has('two')).toBe(false);

    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('three', 3);
    cache.set('two', 6);
    cache.set('four', 4);

    expect(entries(cache)).toEqual([
      ['four', 4],
      ['two', 6],
      ['three', 3],
    ]);
  });

  test("should be possible to create an iterator over the cache's keys and values", () => {
    const cache = new LruCache(3);

    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('three', 3);

    expect(Array.from(cache.keys())).toEqual(['three', 'two', 'one']);
    expect(Array.from(cache.values())).toEqual([3, 2, 1]);
  });

  test('should work with capacity = 1', () => {
    const cache = new LruCache(1);

    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('three', 3);

    expect(entries(cache)).toEqual([['three', 3]]);
    expect(cache.get('one')).toBe(undefined);
    expect(cache.get('three')).toBe(3);
    expect(cache.get('three')).toBe(3);
    expect(entries(cache)).toEqual([['three', 3]]);
  });

  test('should be possible to iterate over the cache', () => {
    const cache = new LruCache(1);

    cache.set('one', 1);
    cache.set('two', 2);
    cache.set('three', 3);

    expect(Array.from(cache)).toEqual(entries(cache));
  });

  test('should be possible to delete keys from a LRU cache', () => {
    const cache = new LruCache(3);

    expect(cache.delete('one')).toBe(false);

    cache.set('one', 'uno');
    cache.set('two', 'dos');
    cache.set('three', 'tres');

    expect(entries(cache)).toEqual([
      ['three', 'tres'],
      ['two', 'dos'],
      ['one', 'uno'],
    ]);

    expect(cache.delete('NEVER SEEN EM')).toBe(false);

    expect(cache.delete('three')).toBe(true);
    expect(entries(cache)).toEqual([
      ['two', 'dos'],
      ['one', 'uno'],
    ]);
    expect(cache.delete('three')).toBe(false);

    cache.set('three', 'trois');
    expect(entries(cache)).toEqual([
      ['three', 'trois'],
      ['two', 'dos'],
      ['one', 'uno'],
    ]);

    expect(cache.delete('two')).toBe(true);
    expect(entries(cache)).toEqual([
      ['three', 'trois'],
      ['one', 'uno'],
    ]);
    expect(cache.delete('two')).toBe(false);

    expect(cache.delete('one')).toBe(true);
    expect(entries(cache)).toEqual([['three', 'trois']]);

    expect(cache.delete('three')).toBe(true);
    expect(cache.size).toBe(0);

    expect(cache.delete('three')).toBe(false);

    cache.set('one', 'uno');
    cache.set('two', 'dos');
    cache.set('three', 'tres');
    cache.set('two', 'deux');
    cache.set('four', 'cuatro');

    expect(entries(cache)).toEqual([
      ['four', 'cuatro'],
      ['two', 'deux'],
      ['three', 'tres'],
    ]);
  });

  test('maintains LRU order regardless of deletions', () => {
    const cache = new LruCache(5);

    cache.set('one', 'uno');
    cache.set('two', 'dos');
    cache.set('three', 'tres');
    cache.set('four', 'cuatro');
    cache.set('five', 'cinco');
    cache.get('one');
    cache.set('six', 'seis');

    expect(entries(cache)).toEqual([
      ['six', 'seis'],
      ['one', 'uno'],
      ['five', 'cinco'],
      ['four', 'cuatro'],
      ['three', 'tres'],
    ]);

    expect(cache.delete('five')).toBe(true);
    expect(cache.delete('not_here')).toBe(false);

    cache.set('one', 'rast');
    expect(entries(cache)).toEqual([
      ['one', 'rast'],
      ['six', 'seis'],
      ['four', 'cuatro'],
      ['three', 'tres'],
    ]);

    cache.set('seven', 'siete');
    expect(entries(cache)).toEqual([
      ['seven', 'siete'],
      ['one', 'rast'],
      ['six', 'seis'],
      ['four', 'cuatro'],
      ['three', 'tres'],
    ]);

    cache.set('eight', 'ocho');
    expect(entries(cache)).toEqual([
      ['eight', 'ocho'],
      ['seven', 'siete'],
      ['one', 'rast'],
      ['six', 'seis'],
      ['four', 'cuatro'],
    ]);

    expect(cache.delete('five')).toBe(false);
    expect(entries(cache)).toEqual([
      ['eight', 'ocho'],
      ['seven', 'siete'],
      ['one', 'rast'],
      ['six', 'seis'],
      ['four', 'cuatro'],
    ]);
  });

  test('enjoys a healthy workout of deletions', () => {
    const cache = new LruCache(4);

    cache.set(0, 'cero');
    cache.set(1, 'uno');
    cache.set(2, 'dos');
    cache.delete(1);
    cache.set(3, 'tres');
    cache.set(4, 'cuatro');
    cache.get(2);
    expect(entries(cache)).toEqual([
      [2, 'dos'],
      [4, 'cuatro'],
      [3, 'tres'],
      [0, 'cero'],
    ]);

    cache.set(5, 'cinco');
    cache.set(6, 'seis');
    cache.delete(1);
    cache.delete(2);
    cache.set(5, 'cinq');
    expect(entries(cache)).toEqual([
      [5, 'cinq'],
      [6, 'seis'],
      [4, 'cuatro'],
    ]);

    cache.set(7, 'siete');
    cache.set(8, 'ocho');
    cache.set(9, 'nueve');
    cache.delete(8);
    cache.set(10, 'diez');
    expect(entries(cache)).toEqual([
      [10, 'diez'],
      [9, 'nueve'],
      [7, 'siete'],
      [5, 'cinq'],
    ]);

    cache.set(7, 'sept');
    cache.get(5);
    cache.set(8, 'huit');
    cache.set(9, 'neuf');
    cache.set(10, 'dix');
    expect(entries(cache)).toEqual([
      [10, 'dix'],
      [9, 'neuf'],
      [8, 'huit'],
      [5, 'cinq'],
    ]);

    cache.get(8);
    cache.delete(10);
    cache.set(1, 'rast');
    cache.set(2, 'deux');
    cache.get(8);
    expect(entries(cache)).toEqual([
      [8, 'huit'],
      [2, 'deux'],
      [1, 'rast'],
      [9, 'neuf'],
    ]);

    cache.delete(2);
    cache.delete(9);
    cache.get(1);
    cache.set(2, 'dva');
    cache.get(1);
    cache.set(3, 'tri');
    expect(entries(cache)).toEqual([
      [3, 'tri'],
      [1, 'rast'],
      [2, 'dva'],
      [8, 'huit'],
    ]);
  });

  test('deleting the tail does not corrupt its neighbour', () => {
    const cache = new LruCache(4);

    cache.set('k3', 1);
    cache.set('k2', 1);
    cache.set('k1', 1);
    cache.set('k5', 1);
    cache.set('k4', 1);
    cache.set('k5', 1);
    cache.delete('k2');
    cache.set('k4', 1);

    expect(cache.size).toBe(3);
    expect(Array.from(cache.keys())).toEqual(['k4', 'k5', 'k1']);
  });
});
