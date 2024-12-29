import type { TimeValue } from '@/types';
import { isTimeObject } from '../isTimeObject';
import { isTimeString } from '../isTimeString';

/**
 * Checks if a given value is a valid `TimeValue`.
 *
 * @param {unknown} value - The value to check if it's a valid `TimeValue`.
 * @returns {value is TimeObject} - Returns `true` if the value is a valid `TimeValue`, otherwise `false`.
 *
 * @example
 * // Valid TimeObject
 * isTimeValue({ h: 15, m: 30 }); // true
 *
 * @example
 * // Valid TimeString
 * isTimeValue('15:30'); // true
 *
 * @group Date
 */
export function isTimeValue(value: unknown): value is TimeValue {
  return isTimeString(value) || isTimeObject(value);
}
