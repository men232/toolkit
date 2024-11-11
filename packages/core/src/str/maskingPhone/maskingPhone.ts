import { isString } from '@/is';

/**
 * Pretty simple phone number masking function without input value validation.
 *
 * Support formatted input like: `(000) 000-11-11`
 *
 * ⚠️ Returns empty string when invalid value passed.
 *
 * @example
 * maskingPhone('+18000551100'); // '+18XXXXX1100'
 * maskingPhone('+18000551100', 2, 4, '*'); // '+18*****1100'
 * maskingPhone('+1 800-055-1100'); // '+1 8XX-XXX-1100'
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
