import { nextTickIteration } from '../nextTickIteration';

/**
 * Same as `arr.find()` but with async predicate
 */
export async function asyncFind<T>(
  array: T[],
  callbackfn: (
    value: T,
    index: number,
    array: T[],
  ) => Promise<unknown> | unknown,
) {
  const cooldown = nextTickIteration(10);

  let i = 0;

  while (i < array.length) {
    await cooldown();

    const result = await callbackfn(array[i], i, array);

    if (Boolean(result)) {
      return array[i];
    }

    i++;
  }

  return undefined;
}
