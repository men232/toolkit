import { describe, expect, test } from 'vitest';
import { AssertionError } from '@/errors';
import { chunk } from './chunk';

describe('chunk', () => {
  test('must split by 2 equal chunks', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(chunk(input, 2)).toStrictEqual([
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
      [9, 10],
    ]);
  });

  test('when not equal the last item', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    expect(chunk(input, 3)).toStrictEqual([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
      [10],
    ]);
  });
  test('should throw a clear error for a size below 1', () => {
    for (const size of [0, -2, 0.5, NaN]) {
      expect(() => chunk([1, 2, 3], size), String(size)).toThrow(
        AssertionError,
      );
      expect(() => chunk([1, 2, 3], size), String(size)).toThrow(
        'Chunk size must be at least 1',
      );
    }
  });

  test('should floor a fractional size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2.5)).toStrictEqual([[1, 2], [3, 4], [5]]);
  });

  test('should return an empty array for an empty list', () => {
    expect(chunk([], 3)).toStrictEqual([]);
  });
});
