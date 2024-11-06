import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
import { asyncFilter } from './asyncFilter';

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

describe('asyncFilter', () => {
  it('arr.filter capability', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const filterNative = createPredicate((_, idx) => idx % 2 === 0);
    const filterAsync = createPredicate((_, idx) => idx % 2 === 0);

    const resultNative = arr.filter(filterNative.predicate);
    const resultAsync = await asyncFilter(arr, filterAsync.predicate);

    expect(resultNative).toEqual(resultAsync);
    expect(filterNative.handledIndexes).toEqual(filterAsync.handledIndexes);
    expect(filterNative.handledItems).toEqual(filterAsync.handledItems);
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
