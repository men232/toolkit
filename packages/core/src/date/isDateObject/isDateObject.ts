import { isNumber } from '@/is';
import { has } from '@/object';
import type { DateObject } from '@/types';

/**
 * Checks if a given value is a valid `DateObject`.
 *
 * A valid `DateObject` is an object that contains numeric `year`, `month`, and `date` properties.
 *
 * @param {unknown} value - The value to be checked.
 * @returns {value is DateObject} - Returns `true` if the value is a valid `DateObject`; otherwise, `false`.
 *
 * @example
 * // Valid DateObject
 * isDateObject({ year: 2024, month: 11, date: 8 }); // true
 *
 * @example
 * // Missing properties
 * isDateObject({ year: 2024, month: 11 }); // false
 *
 * @example
 * // Non-numeric values
 * isDateObject({ year: '2024', month: 11, date: 8 }); // false
 *
 * @example
 * // Non-object input
 * isDateObject('invalid'); // false
 *
 * @example
 * // Additional properties (still valid)
 * isDateObject({ year: 2024, month: 11, date: 8, extra: 'property' }); // true
 *
 * @group Date
 */
export function isDateObject(value: unknown): value is DateObject {
  return (
    has(value, ['year', 'month', 'date']) &&
    isNumber(value.year) &&
    isNumber(value.month) &&
    isNumber(value.date)
  );
}
