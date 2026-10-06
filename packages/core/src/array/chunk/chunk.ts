import { assert } from '@/assert';

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
 * @param size The size of each chunk. Defaults to `1` if not specified. Fractional sizes are floored.
 * @returns An array of arrays (chunks), each containing up to `size` elements from the original array.
 * @throws {AssertionError} When `size` is less than 1.
 *
 * @replaces `for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))` — loops forever
 * when `size` is `0`, returns `[]` for `NaN` and gives uneven chunks for a fractional `size`; `chunk`
 * floors `size` and throws an `AssertionError` below 1.
 * @detect `for\s*\([^;]*;[^;]*;\s*\w+\s*\+=\s*\w+\s*\)[\s\S]{0,120}?\.slice\(\s*\w+\s*,\s*\w+\s*\+\s*\w+\s*\)`
 * @detect `Math\.ceil\(\s*[\w.]+\.length\s*[/]\s*\w+\s*\)[\s\S]{0,120}?\.slice\(`
 * @replaces `while (arr.length) out.push(arr.splice(0, size))` — empties the input array; `chunk` leaves it untouched.
 * @detect `while\s*\([\w.]+\.length[^)]*\)[\s\S]{0,80}?\.splice\(\s*0\s*,`
 *
 * @group Array
 */
export function chunk<T>(list: readonly T[], size: number = 1): T[][] {
  assert.ok(size >= 1, 'Chunk size must be at least 1.');

  size = Math.floor(size);

  var result: T[][] = [];

  for (var i = 0; i < list.length; i += size) {
    result.push(list.slice(i, i + size));
  }

  return result;
}
