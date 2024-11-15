/**
 * Splits an array into smaller sub-arrays (chunks) of a specified size.
 *
 * If the array can't be evenly divided, the last chunk will contain the remaining elements.
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
 * @example
 * const data = [1, 2, 3, 4, 5];
 * const chunkSize = 2;
 * const result = chunk(data, chunkSize);
 * console.log(result);
 * // [
 * //    [1, 2],
 * //    [3, 4],
 * //    [5]
 * // ]
 *
 * @param list The array to be split into chunks.
 * @param size The size of each chunk. Defaults to `1` if not specified.
 * @returns An array of arrays (chunks), each containing up to `size` elements from the original array.
 *
 * @group Array
 */
export function chunk<T>(list: readonly T[], size: number = 1): T[][] {
  return list.reduce((res, item, index) => {
    if (index % size === 0) {
      res.push([]);
    }
    res[res.length - 1].push(item);
    return res;
  }, [] as T[][]);
}
