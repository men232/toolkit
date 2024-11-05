import { describe, expect, test } from 'vitest';
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
});
