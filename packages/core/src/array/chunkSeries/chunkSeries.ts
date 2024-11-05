/**
 * Collapses a continuous series into a tuple of two elements.
 *
 * Where the first element is the beginning of the series.
 * Where the second element is the end of the series.
 *
 * ⚠️ Tuple may consist only one element if the series not started, like: [1, 3] => [[1], [3]]
 *
 * @example
 * const numbers = [1, 2, 3, 8, 9, 10, 15];
 *
 * chunkSeries(numbers); // [[1, 3], [8, 10], [15]]
 *
 * @group Numbers
 */
export function chunkSeries(list: number[], step = 1): number[][] {
  const result: number[][] = [];

  if (!list.length) {
    return result;
  }

  const sortedList = [...list].sort();

  let currentRange = [list[0]];
  let currentValue: number;

  for (let idx = 1; idx < sortedList.length; idx++) {
    currentValue = sortedList[idx];

    if (currentValue - currentRange.at(-1)! > step) {
      result.push(currentRange);
      currentRange = [currentValue];
    } else {
      currentRange[1] = currentValue;
    }
  }

  result.push(currentRange);

  return result;
}
