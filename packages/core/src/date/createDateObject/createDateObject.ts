import { assert } from '@/assert';
import { isDate, isNumber, isString } from '@/is';
import type { DateObject } from '@/types';
import { isDateObject } from '../isDateObject';

export type DateObjectInput = Date | string | number | DateObject;

export function createDateObject(value: DateObjectInput): DateObject;
export function createDateObject(
  value: DateObjectInput,
  returnsNullWhenInvalid: true,
): DateObject | null;

/**
 * Converts a given input into a `DateObject` representing year, month, and date.
 *
 * The function supports inputs in various formats, including a `Date` object,
 * a `number` (timestamp), or an existing `DateObject`. If the input is invalid
 * and `returnsNullWhenInvalid` is set to `true`, the function returns `null`.
 * Otherwise, it throws an error for invalid input.

 * @param {DateObjectInput} value - The input to be converted into a `DateObject`.
 * @param {boolean} [returnsNullWhenInvalid=false] - If `true`, returns `null` for invalid input
 * instead of throwing an error.
 * @returns {DateObject | null} - A `DateObject` representing the date, or `null` if input is invalid
 * and `returnsNullWhenInvalid` is set to `true`.
 *
 * @throws {Error} If the input is invalid and `returnsNullWhenInvalid` is `false`.
 *
 * @example
 * // Using a valid Date object
 * createDateObject(new Date('2024-12-08')); // { year: 2024, month: 12, date: 8 }
 *
 * @example
 * // Using a valid timestamp
 * createDateObject(1702032000000); // { year: 2024, month: 12, date: 8 }
 *
 * @example
 * // Using an existing DateObject
 * createDateObject({ year: 2024, month: 12, date: 8 }); // { year: 2024, month: 12, date: 8 }
 *
 * @example
 * // Invalid input, returning null
 * createDateObject('invalid-date', true); // null
 *
 * @example
 * // Invalid input, throwing an error
 * createDateObject('invalid-date'); // Throws "Failed to date parse: invalid-date."
 *
 * @group Date
 */
export function createDateObject(
  value: DateObjectInput,
  returnsNullWhenInvalid = false,
): DateObject | null {
  let result: DateObject | null = null;
  let inputValue = value;

  if (isNumber(inputValue) || isString(inputValue)) {
    inputValue = new Date(inputValue);
  }

  if (isDate(inputValue)) {
    result = {
      year: inputValue.getFullYear(),
      month: inputValue.getMonth() + 1,
      date: inputValue.getDate(),
    };
  } else if (isDateObject(inputValue)) {
    result = { ...inputValue };
  }

  assert.ok(
    returnsNullWhenInvalid || !!result,
    `Failed to date parse: ${value}.`,
  );

  return result;
}
