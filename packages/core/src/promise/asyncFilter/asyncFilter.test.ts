import { getRandomInt } from '@/num';
import { describe, expect, it } from 'vitest';
import { delay } from '../delay';
import { asyncFilter } from './asyncFilter';

describe('asyncFilter', () => {
  it('arr.filter capability', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 1];
    const predicate = (v: number, idx: number) => v === 1 || idx % 2 === 0;

    const resultNative = arr.filter(predicate);
    const resultAsync = await asyncFilter(
      arr,
      async (item, idx) => {
        // Add random delay to test that filtering works despite async timing
        await delay(getRandomInt(1, 2));
        return predicate(item, idx);
      },
      { concurrency: 4 },
    );

    // Test that results are identical
    expect(resultAsync).toEqual(resultNative);

    // Test that filtered length is correct
    expect(resultAsync).toHaveLength(resultNative.length);
  });

  it('not block event loop', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    let filterCompleted = false;
    let calledWhileFiltering = false;

    await Promise.all([
      asyncFilter(arr, (_, idx) => idx % 2 === 0).then(
        () => (filterCompleted = true),
      ),
      Promise.resolve().then(() => {
        if (!filterCompleted) calledWhileFiltering = true;
      }),
    ]);

    expect(calledWhileFiltering).toBe(true);
  });

  it('async predicate', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

    const result = await asyncFilter(arr, (_, idx) =>
      Promise.resolve(idx % 2 === 0),
    );

    expect(result).toEqual([1, 3, 5, 7, 9]);
  });
});
