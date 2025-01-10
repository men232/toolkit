import { describe, expect, it } from 'vitest';
import { type WrrItem, weightedRoundRobin } from '.';

describe('weightedRoundRobin', () => {
  it('should return items with weighted probability', () => {
    const items: WrrItem<string>[] = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 2 },
      { item: 'c', weight: 3 },
    ];

    const getItem = weightedRoundRobin(items);

    const resultCount: Record<string, number> = { a: 0, b: 0, c: 0 };
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const result = getItem();
      resultCount[result]++;
    }

    // Normalize counts to approximate weights
    const totalWeight = items.reduce((sum, item) => sum + item.weight!, 0);
    const expectedRatios = {
      a: items[0].weight! / totalWeight,
      b: items[1].weight! / totalWeight,
      c: items[2].weight! / totalWeight,
    };

    const tolerance = 0.05; // Allowable deviation due to randomness

    expect(resultCount.a / iterations).toBeCloseTo(expectedRatios.a, tolerance);
    expect(resultCount.b / iterations).toBeCloseTo(expectedRatios.b, tolerance);
    expect(resultCount.c / iterations).toBeCloseTo(expectedRatios.c, tolerance);
  });

  it('should handle items with no weight (defaulting to weight 1)', () => {
    const items: WrrItem<string>[] = [
      { item: 'a', weight: 1 },
      { item: 'b', weight: 2 },
      { item: 'c', weight: 0 }, // Explicit zero weight
      { item: 'd' }, // Implicit weight 1
    ];

    const getItem = weightedRoundRobin(items);

    const resultCount: Record<string, number> = { a: 0, b: 0, c: 0, d: 0 };
    const iterations = 10000;

    for (let i = 0; i < iterations; i++) {
      const result = getItem();
      resultCount[result]++;
    }

    // Normalize counts to approximate weights
    const totalWeight = items.reduce(
      (sum, item) => sum + (item.weight || 1),
      0,
    );
    const expectedRatios = {
      a: (items[0].weight || 1) / totalWeight,
      b: (items[1].weight || 1) / totalWeight,
      c: (items[2].weight || 1) / totalWeight,
      d: (items[3].weight || 1) / totalWeight,
    };

    const tolerance = 0.05; // Allowable deviation due to randomness

    expect(resultCount.a / iterations).toBeCloseTo(expectedRatios.a, tolerance);
    expect(resultCount.b / iterations).toBeCloseTo(expectedRatios.b, tolerance);
    expect(resultCount.c / iterations).toBeCloseTo(expectedRatios.c, tolerance);
    expect(resultCount.d / iterations).toBeCloseTo(expectedRatios.d, tolerance);
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
