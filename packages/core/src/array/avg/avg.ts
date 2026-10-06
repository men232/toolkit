import { isNumber } from '@/is';

/**
 * Calculates the average value from an array of numbers.
 *
 * The function sums up all valid numbers in the array and divides by the count of those valid numbers.
 * If the array is empty or contains no valid numbers, it returns `0`.
 *
 * @example
 * avg([5, 5, 5]); // 5
 * avg([10, 20, 30]); // 20
 * avg([1, 2, 'three', 4]); // 2.33 (ignores non-numeric values)
 * avg([]); // 0
 *
 * @param values An array of numbers (could include invalid values, which will be ignored).
 * @returns The average value of the valid numbers in the array, or `0` if no valid numbers exist.
 *
 * @replaces `arr.reduce((a, b) => a + b, 0) / arr.length` — gives `NaN` for an empty array or any
 * non-number entry; `avg` returns `0` for an empty array and skips non-numbers and `NaN`, dividing by
 * the count of numbers it kept (`Infinity` is kept).
 * @detect `\.reduce\([\s\S]{0,200}?\+[\s\S]{0,200}?,\s*0\s*\)\s*[/]\s*[\w.]+\.length`
 *
 * @group Array
 */
export const avg = (values: readonly number[]) => {
  let sum = 0;
  let amount = 0;

  for (const item of values) {
    if (!isNumber(item)) continue;
    sum += item;
    amount++;
  }

  if (amount === 0) return 0;

  return sum / amount;
};
