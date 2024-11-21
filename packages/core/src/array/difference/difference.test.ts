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
