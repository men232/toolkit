import { nextTickIteration } from '../nextTickIteration';

/**
 * Same as `arr.forEach()` but with async callback and parallel processing.
 *
 * Basic idea to avoid block event loop while iteration over large array.
 *
 * @example
 * async function task(taskName: string) {
 *   const largeArray = Array.from({ length: 100000 }).map((_, idx) => idx);
 *
 *   await asyncForEach(largeArray, (value) => {
 *     if (value % 100 === 0) {
 *       console.log(taskName, 'handle:', value);
 *     }
 *   });
 * }
 *
 * Promise.all([
 *   task('task 1'),
 *   task('task 2'),
 * ]);
 *
 * @group Promise
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
