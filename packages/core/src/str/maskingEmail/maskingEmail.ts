import { isString } from '@/is';
import { maskingWords } from '../maskingWords';

/**
 * Masks part of the email address to provide a simple level of privacy.
 * The username part is partially masked with asterisks, while the domain remains intact.
 *
 * ⚠️ Returns an empty string if the provided value is invalid.
 *
 * @example
 * maskingEmail('andrew@gmail.com'); // 'a****w@gmail.com'
 * maskingEmail('user@domain.com'); // 'u***r@domain.com'
 * maskingEmail('invalidemail'); // ''
 *
 * @param value - The email address to be masked.
 * @returns The masked email address or an empty string if the value is invalid.
 *
 * @group Strings
 */
export function maskingEmail(value: string): string {
  if (!isString(value)) return '';

  const [username, host] = value.split('@', 2);

  if (!username || !host) return '';

  return `${maskingWords(username)}@${host}`;
}
