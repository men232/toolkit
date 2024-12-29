import { assert } from '@/assert';
import { isDate, isNumber, isString } from '@/is';
import type { TimeObject } from '@/types';
import { isTimeObject } from '../isTimeObject';

export type TimeObjectInput = Date | number | string | TimeObject;

export function createTimeObject(value: TimeObjectInput): TimeObject;
export function createTimeObject(
  value: TimeObjectInput,
  returnsNullWhenInvalid: true,
): TimeObject | null;

/**
 * Converts a given input into a `TimeObject` representing 24 hours and minutes.
 *
 * The function supports inputs in various formats, including `Date`, `number` (timestamp),
 * `string` (date string), or a pre-existing `TimeObject`. If the input is invalid and
 * `returnsNullWhenInvalid` is set to `true`, the function will return `null`; otherwise,
 * it throws an error.
 *
 * @param {TimeObjectInput} value - The input to be converted into a `TimeObject`.
 * @param {boolean} [returnsNullWhenInvalid=false] - If `true`, returns `null` for invalid input
 * instead of throwing an error.
 * @returns {TimeObject | null} - A `TimeObject` representing the time, or `null` if input is invalid
 * and `returnsNullWhenInvalid` is set to `true`.
 *
 * @throws {Error} If the input is invalid and `returnsNullWhenInvalid` is `false`.
 *
 * @example
 * // Using a valid Date object
 * createTimeObject(new Date('2024-12-08T15:30:00')); // { h: 15, m: 30 }
 *
 * @example
 * // Using a valid timestamp
 * createTimeObject(1702031400000); // { h: 15, m: 30 }
 *
 * @example
 * // Using a valid time string
 * createTimeObject('2024-12-08T15:30:00'); // { h: 15, m: 30 }
 *
 * @example
 * // Using an existing TimeObject
 * createTimeObject({ h: 10, m: 45 }); // { h: 10, m: 45 }
 *
 * @example
 * // Invalid input, returning null
 * createTimeObject('invalid-date', true); // null
 *
 * @example
 * // Invalid input, throwing an error
 * createTimeObject('invalid-date'); // Throws "Failed to time parse: invalid-date."
 *
 * @group Date
 */
export function createTimeObject(
  value: TimeObjectInput,
  returnsNullWhenInvalid = false,
): TimeObject | null {
  let result: TimeObject | null = null;
  let inputValue = value;

  if (isNumber(inputValue)) {
    inputValue = new Date(inputValue);
  } else if (isString(inputValue)) {
    // lest do inline parsing to accept HH:mm:ss
    const [h, m] = inputValue
      .split(':')
      .map(v => v.trim().padStart(2, '0'))
      .map(v => parseInt(v));

    inputValue = { h, m };
  }

  if (isDate(inputValue)) {
    result = {
      h: inputValue.getHours(),
      m: inputValue.getMinutes(),
    };
  } else if (isTimeObject(inputValue)) {
    result = { ...inputValue };
  }

  assert.ok(
    returnsNullWhenInvalid || !!result,
    `Failed to time parse: ${value}.`,
  );

  return result;
}
