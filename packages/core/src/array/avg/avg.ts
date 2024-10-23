import { sum } from '../sum';

/**
 * @group Array
 *
 * @description
 * Calculate average value from numbers array
 *
 * @example
 * avg([5, 5, 5]); // 5
 */
export const avg = (values: number[]) => {
  if (values.length === 0) return 0;
  return sum(values) / values.length;
};
