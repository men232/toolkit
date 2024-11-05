import { isNumber } from '@/is';

/**
 * Round value to provided range

 * @example
 * const min = 5;
 * const max = 10;
 *
 * clamp(7, min, max); // 7
 * clamp(15, min, max); // 10
 *
 * @group Numbers
 */
export const clamp = (num: number, min: number, max: number) => {
  if (!isNumber(num)) return min;
  return Math.min(max, Math.max(min, num));
};
