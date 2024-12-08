/**
 * Converts a `Uint16Array` into a `Uint8Array`.
 *
 * @param {Uint16Array} value - The input `Uint16Array` to convert.
 * @returns {Uint8Array} - The resulting `Uint8Array`, with length twice that of the input `Uint16Array`.
 *
 * @example
 * // Example 1: Converting a valid Uint16Array into a Uint8Array
 * const uint16Array = new Uint16Array([0x1234, 0x5678]);
 * const uint8Array = uint16ToUint8(uint16Array);
 * console.log(uint8Array); // Output: Uint8Array [ 0x34, 0x12, 0x78, 0x56 ]
 *
 * @example
 * // Example 2: Another conversion example
 * const uint16Array2 = new Uint16Array([0xabcd, 0x1234, 0x5678]);
 * const uint8Array2 = uint16ToUint8(uint16Array2);
 * console.log(uint8Array2); // Output: Uint8Array [ 0xcd, 0xab, 0x34, 0x12, 0x78, 0x56 ]
 *
 * @group Binary
 */
export function uint16ToUint8(value: Uint16Array): Uint8Array {
  const uint8Array = new Uint8Array(value.length * 2);
  for (let i = 0; i < value.length; i++) {
    uint8Array[i * 2] = value[i] & 0xff; // Lower 8 bits
    uint8Array[i * 2 + 1] = value[i] >> 8; // Upper 8 bits
  }
  return uint8Array;
}
