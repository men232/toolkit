import { describe, expect, it } from 'vitest';
import { difference } from './difference';

describe('difference', () => {
  it('should the difference of two arrays', () => {
    expect(difference([1, 2, 3], [1])).toEqual([2, 3]);
    expect(difference([], [1, 2, 3])).toEqual([1, 2, 3]);
    expect(difference([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
    expect(difference([1, 2, 3, 4, 5], [2, 4])).toEqual([1, 3, 5]);
  });

  it('should the difference of three arrays', () => {
    expect(difference([1, 2, 3], [1], [5])).toEqual([2, 3, 5]);
    expect(difference([], [], [])).toEqual([]);
    expect(difference([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
    expect(difference([1, 2, 3, 4, 5], [2, 4], [1, 5])).toEqual([3]);
  });
});

it('should ignore duplicates inside a single array', () => {
  expect(difference([1], [2, 2])).toEqual([1, 2]);
  expect(difference([1, 1, 3], [2, 2, 2], [3])).toEqual([1, 2]);
  expect(difference([1, 2], [2, 2], [4, 4])).toEqual([1, 4]);
});

it('should match a reference implementation on random inputs', () => {
  const reference = (...arrays: number[][]) => {
    const counts = new Map<number, number>();
    for (const items of arrays) {
      for (const item of new Set(items)) {
        counts.set(item, (counts.get(item) ?? 0) + 1);
      }
    }
    return [...counts].filter(([, count]) => count === 1).map(([item]) => item);
  };

  for (let n = 0; n < 500; n++) {
    const arrays = Array.from({ length: 2 + (n % 3) }, () =>
      Array.from(
        { length: (Math.random() * 8) | 0 },
        () => (Math.random() * 6) | 0,
      ),
    );

    expect(difference(...arrays)).toEqual(reference(...arrays));
  }
});
