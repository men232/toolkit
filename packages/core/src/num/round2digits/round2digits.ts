/**
 * Round a number to digits
 */
export function round2digits(value: number, digits: number = 2) {
  if (digits === 0) {
    return value << 0;
  }

  // @ts-expect-error
  return Number(Math.round(value + 'e' + digits) + 'e-' + digits);
}
