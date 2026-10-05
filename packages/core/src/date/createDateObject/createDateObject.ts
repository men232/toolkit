import { assert } from '@/assert';
import { isDate, isNumber, isString } from '@/is';
import type { DateObject } from '@/types';
import { isDateObject } from '../isDateObject';

export type DateObjectInput = Date | string | number | DateObject;

const DATE_ONLY_REGEX = /^\d{4}(?:-\d{2}(?:-\d{2})?)?$/;

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
 * // Using a valid Date object (read in local time)
 * createDateObject(new Date(2024, 11, 8)); // { year: 2024, month: 12, date: 8 }
 *
 * @example
 * // Using a date-only string (the calendar date is kept in any timezone)
 * createDateObject('2024-12-08'); // { year: 2024, month: 12, date: 8 }
 *
 * @example
 * // Using a valid timestamp
 * createDateObject(1733659200000); // { year: 2024, month: 12, date: 8 } (2024-12-08T12:00Z, local time)
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
  let isDateOnly = false;

  if (isNumber(inputValue) || isString(inputValue)) {
    isDateOnly = isString(inputValue) && DATE_ONLY_REGEX.test(inputValue);
    inputValue = new Date(inputValue);
  }

  if (isDate(inputValue)) {
    result = isDateOnly
      ? {
          year: inputValue.getUTCFullYear(),
          month: inputValue.getUTCMonth() + 1,
          date: inputValue.getUTCDate(),
        }
      : {
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
