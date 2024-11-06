import type { AnyFunction } from '@/types';
import { describe, expect, it } from 'vitest';
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
    const mapNative = createPredicate(v => v ** 2);
    const mapAsync = createPredicate(v => v ** 2);

    const resultNative = arr.map(mapNative.predicate);
    const resultAsync = await asyncMap(arr, mapAsync.predicate);

    expect(resultNative).toEqual(resultAsync);
    expect(mapNative.handledIndexes).toEqual(mapAsync.handledIndexes);
    expect(mapNative.handledItems).toEqual(mapAsync.handledItems);
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
