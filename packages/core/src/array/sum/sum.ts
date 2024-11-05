import { isNumber } from '@/is';

/**
 * Sum array of numbers
 *
 * @example
 * sum([2, 2]); // 4
 *
 * @group Array
 */
export const sum = (values: readonly number[]) => {
  return values.reduce((a, b) => a + (isNumber(b) ? b : 0), 0);
};
