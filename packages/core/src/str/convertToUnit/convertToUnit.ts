/**
 * Converts a value to a string and appends a specified unit to it.
 * If the value is already a string, it returns it as is, and if the value is a number,
 * it appends the specified unit (defaults to 'px'). If the value is null, undefined, or an empty string, it returns `undefined`.
 *
 * @example
 * // Adding 'px' unit to a number
 * convertToUnit(10, 'px'); // '10px';
 *
 * // Adding 'em' unit to a number
 * convertToUnit(5, 'em'); // '5em';
 *
 * // Returning a string as is if it's not a number
 * convertToUnit('100%', 'px'); // '100%';
 *
 * // Handling null, undefined, and empty string
 * convertToUnit(null); // undefined;
 * convertToUnit(''); // undefined;
 *
 * @param str - The value to convert, can be a number, string, null, or undefined.
 * @param unit - The unit to append to the value. Defaults to 'px'.
 * @returns The value with the unit appended, or `undefined` if the input is null, undefined, or an empty string.
 *
 * @group Strings
 */
export function convertToUnit(
  str: string | number | null | undefined,
  unit = 'px',
): string | undefined {
  if (str == null || str === '') {
    return undefined;
  } else if (isNaN(+str!)) {
    return String(str);
  } else {
    return `${Number(str)}${unit}`;
  }
}
