import { isString } from '@/is';

/**
 * Masks part of a phone number to provide a simple level of privacy.
 * The function replaces digits in a specified range with a given character.
 * Supports formatted phone numbers (e.g., `(000) 000-11-11`).
 *
 * ⚠️ Returns an empty string if the provided value is invalid.
 *
 * @example
 * maskingPhone('+18000551100'); // '+18XXXXX1100'
 * maskingPhone('+18000551100', 2, 4, '*'); // '+18*****1100'
 * maskingPhone('+1 800-055-1100'); // '+1 8XX-XXX-1100'
 * maskingPhone('+1234567890', 3, 5, 'X'); // '+1XXX567890'
 *
 * @param value - The phone number to be masked.
 * @param [fromPosition=2] - The starting position from left side where masking begins (default is 2).
 * @param [toPosition=4] - The position from right side where masking ends (default is 4).
 * @param [withChar='X'] - The character used to replace digits (default is 'X').
 * @returns The masked phone number or an empty string if the value is invalid.
 *
 * @group Strings
 */
export function maskingPhone(
  value: string,
  fromPosition = 2,
  toPosition = 4,
  withChar = 'X',
): string {
  if (!isString(value)) return '';

  const numbersAmount = value.replace(/\D/g, '').length;
  const fromIdx = fromPosition - 1;

  let toIdx = numbersAmount - toPosition;

  if (toIdx <= 0) {
    toIdx = numbersAmount;
  }

  let i = -1;

  return value.replace(/\d/g, char => {
    i++;
    return i > fromIdx && i < toIdx ? withChar : char;
  });
}
