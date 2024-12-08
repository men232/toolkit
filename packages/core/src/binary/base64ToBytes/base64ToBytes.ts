import { assert } from '@/assert';
import { base64, base64url } from '../base64';

export type Base64ToBytesOptions = {
  /**
   * Encoding type
   */
  encoding?: 'base64' | 'base64url';

  /**
   * Whether to enforce strict Base64 decoding.
   */
  strict?: boolean;
};

/**
 * Decodes a Base64 or Base64URL encoded string into a `Uint8Array`.
 *
 * This function supports decoding data from both standard Base64 and Base64URL formats.
 *
 * @param {string} data - The encoded string to decode. Must be a valid Base64 or Base64URL encoded string.
 * @param {Base64ToBytesOptions} [options] - Optional configuration options for decoding.
 * @returns {Uint8Array} - The decoded byte array.
 *
 * @example
 * // Example 1: Decoding a Base64 string
 * const base64String = 'SGVsbG8gd29ybGQ='; // "Hello world"
 * const decodedBytes = base64ToBytes(base64String);
 * console.log(decodedBytes); // Output: Uint8Array [ 72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100 ]
 *
 * @example
 * // Example 2: Decoding a Base64URL encoded string
 * const base64urlString = 'SGVsbG8gd29ybGQ'; // "Hello world"
 * const decodedBytes2 = base64ToBytes(base64urlString, { encoding: 'base64url' });
 * console.log(decodedBytes2); // Output: Uint8Array [ 72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100 ]
 *
 * @example
 * // Example 3: Strict decoding with Base64
 * const base64StringStrict = 'SGVsbG8gd29ybGQ=';
 * const decodedStrict = base64ToBytes(base64StringStrict, { strict: true });
 * console.log(decodedStrict); // Output: Uint8Array [ 72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100 ]
 *
 * @group Binary
 */
export function base64ToBytes(
  data: string,
  { encoding = 'base64', strict }: Base64ToBytesOptions = {},
): Uint8Array {
  if (encoding === 'base64') {
    return base64.decode(data, { strict: strict ?? true });
  } else if (encoding === 'base64url') {
    return base64url.decode(data, { strict: strict ?? false });
  }

  assert.ok(false, 'Invalid encoding options: ' + encoding);
}
