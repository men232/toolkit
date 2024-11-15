import { isNumber } from '@/is';

/**
 * Rounds the given value to a specified range. If the value is less than the minimum,
 * it returns the minimum. If the value is greater than the maximum, it returns the maximum.
 * If the value is within the range, it returns the original value.
 *
 * @param {number} num - The number to be clamped.
 * @param {number} min - The minimum value of the range.
 * @param {number} max - The maximum value of the range.
 * @returns {number} - The clamped value within the specified range.
 *
 * @example
 * const min = 5;
 * const max = 10;
 *
 * // Returns: 7 (within range)
 * clamp(7, min, max);
 *
 * // Returns: 10 (clamped to max)
 * clamp(15, min, max);
 *
 * // Returns: 5 (clamped to min)
 * clamp(3, min, max);
 *
 * @group Numbers
 */
export const clamp = (num: number, min: number, max: number) => {
  if (!isNumber(num)) return min;
  return Math.min(max, Math.max(min, num));
};
