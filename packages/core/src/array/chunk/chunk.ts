/**
 * Takes an array and splits it into smaller sub-arrays (chunks) of a specified size.
 *
 * @example
 * const data = [1, 2, 3, 4, 5, 6, 7, 8, 9];
 * const chunkSize = 3;
 * const result = chunk(data, chunkSize);
 * console.log(result);
 * // [
 * //    [1, 2, 3],
 * //    [4, 5, 6],
 * //    [7, 8, 9]
 * // ]
 *
 * @group Array
 */
export function chunk<T>(list: T[], size: number = 1): T[][] {
  return list.reduce((res, item, index) => {
    if (index % size === 0) {
      res.push([]);
    }
    res[res.length - 1].push(item);
    return res;
  }, [] as T[][]);
}
