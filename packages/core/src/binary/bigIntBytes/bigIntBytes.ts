/**
 * Converts a `bigint` value into a byte array (`Uint8Array`) in big-endian order.
 *
 * This function encodes the absolute value of the provided `bigint` into a minimal byte array,
 * ensuring that the bytes represent the value in big-endian format.
 *
 * @param {bigint} value - The input `bigint` value to convert into bytes.
 * @returns {Uint8Array} - The byte array (`Uint8Array`) representing the provided `bigint`.
 *
 * @example
 * // Example 1: Convert a positive bigint to bytes
 * const value = 1234567890123456789n;
 * const bytes = bigIntBytes(value);
 * console.log(bytes); // Output: Uint8Array representing the bytes in big-endian
 *
 * @example
 * // Example 2: Convert a negative bigint to bytes
 * const valueNegative = -1234567890123456789n;
 * const bytesNegative = bigIntBytes(valueNegative);
 * console.log(bytesNegative); // Output: Uint8Array representing the absolute value in big-endian
 *
 * @example
 * // Example 3: Handle very small bigints
 * const smallValue = 42n;
 * const bytesSmall = bigIntBytes(smallValue);
 * console.log(bytesSmall); // Output: Uint8Array [ 42 ]
 *
 * @example
 * // Example 4: Convert zero value
 * const zeroValue = 0n;
 * const bytesZero = bigIntBytes(zeroValue);
 * console.log(bytesZero); // Output: Uint8Array [ 0 ]
 *
 * @group Binary
 */
export function bigIntBytes(value: bigint): Uint8Array {
  if (value < 0n) {
    value = value * -1n;
  }
  let byteLength = 1;
  while (value > 2n ** BigInt(byteLength * 8) - 1n) {
    byteLength++;
  }
  const encoded = new Uint8Array(byteLength);
  for (let i = 0; i < encoded.byteLength; i++) {
    encoded[i] = Number(
      (value >> BigInt((encoded.byteLength - i - 1) * 8)) & 0xffn,
    );
  }
  return encoded;
}
