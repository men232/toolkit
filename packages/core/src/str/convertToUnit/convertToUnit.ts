/**
 * Add unit postfix to provided value
 *
 * @example
 * convertToUnit(10, 'px'); // '10px';
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
