import { describe, expect, test } from 'vitest';
import { chunkSeries } from './chunkSeries';

describe('chunkSeries', () => {
  test('basic', () => {
    expect(chunkSeries([1, 2, 3, 6, 7])).toStrictEqual([
      [1, 3],
      [6, 7],
    ]);
  });

  test('1 item', () => {
    expect(chunkSeries([1])).toStrictEqual([[1]]);

    expect(chunkSeries([1, 2, 4])).toStrictEqual([[1, 2], [4]]);

    expect(chunkSeries([])).toStrictEqual([]);
  });

  test('3 items', () => {
    expect(chunkSeries([1, 2, 4])).toStrictEqual([[1, 2], [4]]);
  });

  test('empty', () => {
    expect(chunkSeries([])).toStrictEqual([]);
  });

  test('no series', () => {
    expect(chunkSeries([1, 3])).toStrictEqual([[1], [3]]);
  });
});
