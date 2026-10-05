import { describe, expect, it } from 'vitest';
import { type WrrItem, weightedRoundRobin } from '.';

const countPicks = (items: WrrItem<string>[], iterations: number) => {
  const getItem = weightedRoundRobin(items);
  const resultCount: Record<string, number> = {};

  for (let i = 0; i < iterations; i++) {
    const result = getItem();
    resultCount[result] = (resultCount[result] || 0) + 1;
  }

  return resultCount;
};

describe('weightedRoundRobin', () => {
  it('should return items in proportion to their weights', () => {
    const items: WrrItem<string>[] = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 2 },
      { item: 'c', weight: 3 },
    ];

    expect(countPicks(items, 600)).toEqual({ a: 100, b: 200, c: 300 });
  });

  it('should handle items with no weight (defaulting to weight 1)', () => {
    const items: WrrItem<string>[] = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 2 },
      { item: 'c', weight: 0 },
      { item: 'd' },
    ];

    expect(countPicks(items, 500)).toEqual({ a: 100, b: 200, c: 100, d: 100 });
  });

  it('should interleave items within a cycle', () => {
    const getItem = weightedRoundRobin([
      { item: 'a', weight: 3 },
      { item: 'b', weight: 1 },
    ]);

    expect(Array.from({ length: 8 }, getItem)).toEqual([
      'a',
      'a',
      'a',
      'b',
      'a',
      'a',
      'a',
      'b',
    ]);
  });

  it('should return throw error for an empty array', () => {
    expect(() => weightedRoundRobin([])).toThrow('least one item');
  });

  it('should work with a single item in the array', () => {
    const items: WrrItem<string>[] = [{ item: 'only', weight: 5 }];
    const getItem = weightedRoundRobin(items);

    for (let i = 0; i < 100; i++) {
      expect(getItem()).toBe('only');
    }
  });
});
