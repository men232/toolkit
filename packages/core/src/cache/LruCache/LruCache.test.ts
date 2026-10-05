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
