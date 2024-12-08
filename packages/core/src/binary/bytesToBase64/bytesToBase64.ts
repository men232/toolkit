import { assert } from '@/assert';
import { base64, base64url } from '../base64';

export type BytesToBase64Options = {
  /**
   * Specifies the encoding type.
   */
  encoding?: 'base64' | 'base64url';

  /**
   * Whether or not to include padding (`=`) in the encoded result. Defaults to `true` for Base64, `false` for Base64URL.
   */
  padding?: boolean;
};

/**
 * Encodes a byte array (`Uint8Array`) into a Base64 or Base64URL encoded string.
 *
 * The function can encode bytes in either the standard Base64 format or Base64URL format,
 * depending on the specified options. It also allows control over whether padding is included.
 *
 * @param {Uint8Array} data - The byte array to encode into Base64 or Base64URL.
 * @param {BytesToBase64Options} [options] - Optional configuration options.
 * @returns {string} - The encoded Base64 or Base64URL string.
 *
 * @example
 * // Example 1: Encoding with Base64 with default padding
 * const byteArray = new Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]); // "Hello world"
 * const encodedBase64 = bytesToBase64(byteArray);
 * console.log(encodedBase64); // Output: 'SGVsbG8gd29ybGQ='
 *
 * @example
 * // Example 2: Encoding with Base64URL without padding
 * const byteArray2 = new Uint8Array([72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100]); // "Hello world"
 * const encodedBase64URL = bytesToBase64(byteArray2, { encoding: 'base64url', padding: false });
 * console.log(encodedBase64URL); // Output: 'SGVsbG8gd29ybGQ'
 *
 * @example
 * // Example 3: Encoding with Base64 with no padding
 * const byteArray3 = new Uint8Array([1, 2, 3, 4]);
 * const encodedNoPadding = bytesToBase64(byteArray3, { encoding: 'base64', padding: false });
 * console.log(encodedNoPadding); // Output: 'AQIDBA'
 *
 * @example
 * // Example 4: Handling invalid encoding options
 * try {
 *   const invalidEncoding = bytesToBase64(byteArray3, { encoding: 'invalid' });
 * } catch (error) {
 *   console.error(error); // Output: Error: Invalid encoding options: invalid
 * }
 *
 * @group Binary
 */
export function bytesToBase64(
  data: Uint8Array,
  { encoding = 'base64', padding }: BytesToBase64Options = {},
): string {
  if (encoding === 'base64') {
    return base64.encode(data, { includePadding: padding ?? true });
  } else if (encoding === 'base64url') {
    return base64url.encode(data, { includePadding: padding ?? false });
  }

  assert.ok(false, 'Invalid encoding options: ' + encoding);
}
