import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
import { asyncForEach } from './asyncForEach';

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

describe('asyncForEach', () => {
  it('arr.forEach capability', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const findNative = createPredicate((_, idx) => {});
    const findAsync = createPredicate((_, idx) => {});

    const resultNative = arr.find(findNative.predicate);
    const resultAsync = await asyncForEach(arr, findAsync.predicate);

    expect(resultNative).toEqual(resultAsync);
    expect(findNative.handledIndexes).toEqual(findAsync.handledIndexes);
    expect(findNative.handledItems).toEqual(findAsync.handledItems);
  });

  it('not block event loop', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    let filterCompleted = false;
    let calledWhileFiltering = false;

    await Promise.all([
      asyncForEach(arr, (_, idx) => {}).then(() => (filterCompleted = true)),
      Promise.resolve().then(() => {
        if (!filterCompleted) calledWhileFiltering = true;
      }),
    ]);

    expect(calledWhileFiltering).toBe(true);
  });

  it('async predicate', async () => {
    const arr = [1, 2];

    const stateAt = Date.now();
    const result = await asyncForEach(arr, (_, idx) => {
      return new Promise(resolve => setTimeout(resolve, 100));
    });

    expect(Date.now() - stateAt).greaterThanOrEqual(200);
  });
});
