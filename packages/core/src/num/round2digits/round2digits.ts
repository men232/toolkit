/**
 * Round a number to digits
 *
 * @example
 * console.log(round2digits(3.3333333, 1)); // 3.3
 * console.log(round2digits(3.3333333, 2)); // 3.33
 * console.log(round2digits(3.3333333, 3)); // 3.333
 *
 * @group Numbers
 */
export function round2digits(value: number, digits: number = 2) {
  if (digits === 0) {
    return value << 0;
  }

  // @ts-expect-error
  return Number(Math.round(value + 'e' + digits) + 'e-' + digits);
}
