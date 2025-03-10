/**
 * Converts the first character of string to upper case and the remaining to lower case.
 *
 * @template T - Literal type of the string.
 * @param {T} str - The string to be converted to uppercase.
 * @returns {Capitalize<T>} - The capitalized string.
 *
 * @example
 * const result = capitalize('fred') // returns 'Fred'
 * const result2 = capitalize('FRED') // returns 'Fred'
 *
 * @group Strings
 */

export function capitalize<T extends string>(str: T): Capitalize<T> {
  return (str.charAt(0).toUpperCase() +
    str.slice(1).toLowerCase()) as Capitalize<T>;
}

type Capitalize<T extends string> = T extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${Lowercase<R>}`
  : T;
