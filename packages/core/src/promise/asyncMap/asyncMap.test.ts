import { getRandomInt } from '@/num';
import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
import { delay } from '../delay';
import { asyncMap } from './asyncMap';

const createPredicate = (fn: AnyFunction) => {
  const handledItems: any[] = [];
  const handledIndexes: number[] = [];

  const predicate = (item: any, idx: number) => {
    handledItems.push(item);
    handledIndexes.push(idx);
    return fn(item, idx);
  };

  return { predicate, handledIndexes, handledItems };
};

describe('asyncMap', () => {
  it('arr.map capability', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const transform = (v: number) => v ** 2;

    const resultNative = arr.map(transform);
    const resultAsync = await asyncMap(
      arr,
      async (v, idx) => {
        // Add random delay to test that results maintain order despite async timing
        await delay(getRandomInt(1, 2));
        return transform(v);
      },
      { concurrency: 3 },
    );

    // Test that results are identical
    expect(resultAsync).toEqual(resultNative);

    // Test that all items were processed
    expect(resultAsync).toHaveLength(arr.length);
  });

  it('maintains order with different completion times', async () => {
    const arr = [1, 2, 3, 4, 5];

    const resultAsync = await asyncMap(
      arr,
      async (v, idx) => {
        // Reverse delay timing - later items complete first
        await delay((arr.length - idx) * 10);
        return v * 10;
      },
      { concurrency: 5 },
    );

    // Despite reverse completion order, results should match input order
    expect(resultAsync).toEqual([10, 20, 30, 40, 50]);
  });

  it('not block event loop', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    let filterCompleted = false;
    let calledWhileFiltering = false;

    await Promise.all([
      asyncMap(arr, (_, idx) => {}).then(() => (filterCompleted = true)),
      Promise.resolve().then(() => {
        if (!filterCompleted) calledWhileFiltering = true;
      }),
    ]);

    expect(calledWhileFiltering).toBe(true);
  });

  it('async predicate', async () => {
    const arr = [1, 2];

    const stateAt = Date.now();

    await asyncMap(arr, v => {
      return new Promise(resolve => setTimeout(() => resolve(v ** 2), 100));
    });

    expect(Date.now() - stateAt).greaterThanOrEqual(200);
  });
});
