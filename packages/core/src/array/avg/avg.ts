import { isNumber } from '@/is';

/**
 * Calculate average value from numbers array
 *
 * Returns `0` when empty values array.
 *
 * @example
 * avg([5, 5, 5]); // 5
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
