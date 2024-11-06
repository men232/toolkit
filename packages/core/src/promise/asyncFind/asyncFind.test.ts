import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
import { asyncFind } from './asyncFind';

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

describe('asyncFind', () => {
  it('arr.find capability', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const findNative = createPredicate((_, idx) => idx === 10);
    const findAsync = createPredicate((_, idx) => idx === 10);

    const resultNative = arr.find(findNative.predicate);
    const resultAsync = await asyncFind(arr, findAsync.predicate);

    expect(resultNative).toEqual(resultAsync);
    expect(findNative.handledIndexes).toEqual(findAsync.handledIndexes);
    expect(findNative.handledItems).toEqual(findAsync.handledItems);
  });

  it('not block event loop', async () => {
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

    let filterCompleted = false;
    let calledWhileFiltering = false;

    await Promise.all([
      asyncFind(arr, (_, idx) => idx % 2 === 0).then(
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

    const result = await asyncFind(arr, (_, idx) => Promise.resolve(idx === 8));

    expect(result).toEqual(9);
  });
});
