import { nextTickIteration } from '@/promise';

/**
 * Same as `arr.filter()` but with async predicate
 */
export async function asyncFilter<T>(
  array: T[],
  predicate: (
    value: T,
    index: number,
    array: Array<T>,
  ) => Promise<boolean> | boolean,
): Promise<T[]> {
  const result: T[] = [];

  const cooldown = nextTickIteration(10);

  for (let idx = 0; idx < array.length; idx++) {
    await cooldown();

    const value = array[idx];
    const valid = await predicate(value, idx, array);

    if (valid) {
      result.push(value);
    }
  }

  return result;
}
