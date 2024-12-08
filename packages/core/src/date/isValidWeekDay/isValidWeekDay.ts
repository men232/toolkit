import { isNumber } from '@/is';

/**
 * Checks if a given value is a valid weekday number.
 *
 * A valid weekday number is a number between 1 (Monday) and 7 (Sunday), inclusive.
 *
 * @param {unknown} value - The value to check if it's a valid weekday number.
 * @returns {value is number} - Returns `true` if the value is a number and represents a valid weekday, otherwise `false`.
 *
 * @example
 * // Valid weekday numbers
 * isValidWeekDay(1); // true
 * isValidWeekDay(7); // true
 *
 * @example
 * // Invalid weekday numbers
 * isValidWeekDay(0); // false
 * isValidWeekDay(8); // false
 * isValidWeekDay(-1); // false
 * isValidWeekDay('3'); // false
 * isValidWeekDay(null); // false
 * isValidWeekDay(undefined); // false
 *
 * @group Date
 */
export function isValidWeekDay(value: unknown): value is number {
  return isNumber(value) && Number.isInteger(value) && value >= 1 && value <= 7;
}
