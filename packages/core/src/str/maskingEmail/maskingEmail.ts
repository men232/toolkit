import { isString } from '@/is';

/**
 * Masks part of the email address to provide a simple level of privacy.
 * The username part is masked as a whole, keeping its first and last characters and its length,
 * while the domain remains intact.
 *
 * ⚠️ Returns an empty string if the provided value is invalid.
 *
 * @example
 * maskingEmail('andrew@gmail.com'); // 'a****w@gmail.com'
 * maskingEmail('user@domain.com'); // 'u**r@domain.com'
 * maskingEmail('john.doe@x.io'); // 'j******e@x.io'
 * maskingEmail('invalidemail'); // ''
 *
 * @param value - The email address to be masked.
 * @returns The masked email address or an empty string if the value is invalid.
 *
 * @group Strings
 */
export function maskingEmail(value: string): string {
  if (!isString(value)) return '';

  const { 0: username, 1: host } = value.split('@', 2);

  if (!username || !host) return '';

  const len = username.length;
  const masked =
    len < 2
      ? '*'
      : len < 3
        ? username[0] + '*'
        : username[0] + '*'.repeat(len - 2) + username[len - 1];

  return `${masked}@${host}`;
}
