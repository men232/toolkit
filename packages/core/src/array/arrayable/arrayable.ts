import { isString } from '@/is';

type ItemType<T> =
  T extends Array<infer X>
    ? X
    : T extends string
      ? string
      : Exclude<T, null | undefined>;

/**
 * Converts a value into an array. This function handles different types of input,
 * converting them to arrays as follows:
 * - If the value is already an array, it returns it as-is.
 * - If the value is a string, it splits the string by commas and trims the elements.
 * - If the value is null or undefined, it returns an empty array.
 * - Otherwise, it wraps the value in an array.
 *
 * @example
 * arrayable(42); // [42]
 * arrayable('a, b, c'); // ['a', 'b', 'c']
 * arrayable([1, 2, 3]); // [1, 2, 3]
 * arrayable(null); // []
 * arrayable(undefined); // []
 *
 * @param value The value to convert into an array. It can be of any type.
 * @returns An array derived from the input value.
 *
 * @group Array
 */
export function arrayable<T>(value: Readonly<T>): ItemType<T>[] {
  const result: any = Array.isArray(value)
    ? value
    : value === null
      ? []
      : value === undefined
        ? []
        : isString(value)
          ? value
              .split(',')
              .map(v => v.trim())
              .filter(Boolean)
          : [value];

  return result;
}
