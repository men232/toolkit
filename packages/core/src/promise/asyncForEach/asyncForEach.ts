import { nextTickIteration } from '../nextTickIteration';

/**
 * Same as `arr.forEach()` but with async callback and parallel processing
 */
export async function asyncForEach<T>(
  array: T[],
  callbackfn: (
    value: T,
    index: number,
    array: Array<T>,
  ) => Promise<void> | void,
  { concurrency = 1 } = {},
): Promise<void> {
  const cooldown = nextTickIteration(10);

  let i = 0;

  const handle = (value: T, index: number) => {
    return callbackfn(value, i + index, array);
  };

  while (i < array.length) {
    await cooldown();

    const batch = await Promise.all(
      array.slice(i, i + concurrency).map(handle),
    );

    i += batch.length;
  }
}
