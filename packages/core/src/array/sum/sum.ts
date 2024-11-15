import { isNumber } from '@/is';

/**
 * Sums the values in an array of numbers, ignoring non-numeric values.
 *
 * This function adds all valid numbers in the array and returns the sum.
 * Non-numeric values (e.g., `null`, `undefined`, `NaN` are ignored in the sum.
 *
 * @example
 * sum([2, 2]); // 4
 * sum([1, 'a', 3, 4]); // 8 (non-numeric 'a' is ignored)
 * sum([5, null, 10]); // 15 (null is ignored)
 * sum([]); // 0 (empty array returns 0)
 *
 * @param values The array of numbers to be summed.
 * @returns The sum of the numbers in the array.
 *
 * @group Array
 */
export const sum = (values: readonly number[]) => {
  return values.reduce((a, b) => a + (isNumber(b) ? b : 0), 0);
};
