import { isNumber, isPlainObject } from '@/is';
import type { TimeObject } from '@/types';

/**
 * Checks if a given value is a valid `TimeObject`.
 *
 * @param {unknown} value - The value to check if it's a valid `TimeObject`.
 * @returns {value is TimeObject} - Returns `true` if the value is a valid `TimeObject`, otherwise `false`.
 *
 * @example
 * // Valid TimeObject
 * isTimeObject({ h: 15, m: 30 }); // true
 *
 * @example
 * // Invalid TimeObject (missing `m`)
 * isTimeObject({ h: 15 }); // false
 *
 * @example
 * // Invalid TimeObject (non-number values)
 * isTimeObject({ h: '15', m: 30 }); // false
 * isTimeObject({ h: 15, m: '30' }); // false
 *
 * @example
 * // Invalid TimeObject (out-of-range hours)
 * isTimeObject({ h: -1, m: 30 }); // false
 * isTimeObject({ h: 24, m: 30 }); // false
 *
 * @example
 * // Invalid TimeObject (out-of-range minutes)
 * isTimeObject({ h: 15, m: -1 }); // false
 * isTimeObject({ h: 15, m: 60 }); // false
 *
 * @example
 * // Invalid TimeObject (non-object input)
 * isTimeObject('string'); // false
 * isTimeObject(123); // false
 * isTimeObject([]); // false
 *
 * @group Date
 */
export function isTimeObject(value: unknown): value is TimeObject {
  return (
    isPlainObject(value) &&
    'h' in value &&
    'm' in value &&
    isNumber(value.h) &&
    Number.isInteger(value.h) &&
    isNumber(value.m) &&
    Number.isInteger(value.m) &&
    value.h >= 0 &&
    value.h < 24 &&
    value.m >= 0 &&
    value.m < 60
  );
}
