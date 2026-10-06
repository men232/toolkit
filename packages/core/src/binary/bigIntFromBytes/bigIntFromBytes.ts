import { assert } from '@/assert';

const HEX: string[] = [];
for (let i = 0; i < 256; i++) HEX[i] = (i < 16 ? '0' : '') + i.toString(16);

/**
 * Converts a byte array (`Uint8Array`) into a `bigint`. The byte array is interpreted in big-endian order.
 *
 * This function takes a byte array and decodes it into its corresponding `bigint` value by treating
 * the byte array as a big-endian encoded number.
 *
 * @param {Uint8Array} bytes - The byte array to decode into a `bigint`. Must have at least one byte.
 * @returns {bigint} - The decoded `bigint` value.
 *
 * @throws {Error} Will throw an error if the input byte array is empty.
 *
 * @example
 * // Example 1: Decode a simple byte array
 * const byteArray = new Uint8Array([0, 0, 0, 42]); // Represents the number 42 in big-endian
 * const decodedValue = bigIntFromBytes(byteArray);
 * console.log(decodedValue); // Output: 42n
 *
 * @example
 * // Example 2: Decode a multi-byte number
 * const byteArrayMulti = new Uint8Array([0x12, 0x34, 0x56, 0x78]); // Represents the number 305419896
 * const decodedMulti = bigIntFromBytes(byteArrayMulti);
 * console.log(decodedMulti); // Output: 305419896n
 *
 * @example
 * // Example 3: Decode a single byte number
 * const byteArraySingle = new Uint8Array([255]); // Represents the number 255
 * const decodedSingle = bigIntFromBytes(byteArraySingle);
 * console.log(decodedSingle); // Output: 255n
 *
 * @example
 * // Example 4: Attempt decoding an invalid empty array
 * try {
 *   const emptyArray = new Uint8Array([]);
 *   const decodedEmpty = bigIntFromBytes(emptyArray);
 * } catch (error) {
 *   console.error(error); // Output: Error: Empty Uint8Array
 * }
 *
 * @group Binary
 */
export function bigIntFromBytes(bytes: Uint8Array): bigint {
  assert.ok(bytes.byteLength > 0, 'Empty Uint8Array');

  var len = bytes.length,
    i = 0,
    n = 0;

  if (len <= 6) {
    for (; i < len; i++) n = n * 256 + bytes[i];
    return BigInt(n);
  }

  if (len <= 10) {
    var end = len - 4;
    for (; i < end; i++) n = n * 256 + bytes[i];
    var lo =
      ((bytes[i] << 24) |
        (bytes[i + 1] << 16) |
        (bytes[i + 2] << 8) |
        bytes[i + 3]) >>>
      0;
    return (BigInt(n) << 32n) | BigInt(lo);
  }

  var hex = '0x';
  for (; i < len; i++) hex += HEX[bytes[i]];
  return BigInt(hex);
}
