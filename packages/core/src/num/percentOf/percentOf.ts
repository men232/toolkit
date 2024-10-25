import { round2digits } from '../round2digits';

/**
 * Get percent of value
 *
 * @example
 * console.log(percentOf(200, 20)); // 20% of 200 = 40
 *
 * @group Numbers
 */
export function percentOf(value: number, percent: number, digits?: number) {
  let result = (percent / 100) * value;

  if (digits) {
    result = round2digits(result, digits);
  }

  return result;
}
