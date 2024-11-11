import { isString } from '@/is';
import { maskingWords } from '../maskingWords';

/**
 * Pretty simple email masking function without input value validation.
 *
 * ⚠️ Returns empty string when invalid value passed.
 *
 * @example
 * maskingEmail('andrew@gmail.com'); // 'a****w@gmail.com'
 *
 * @group Strings
 */
export function maskingEmail(value: string): string {
  if (!isString(value)) return '';

  const [username, host] = value.split('@', 2);

  if (!username || !host) return '';

  return `${maskingWords(username)}@${host}`;
}
