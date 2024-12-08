/**
 * Converts a `Uint32Array` into a `Uint8Array`.
 *
 * @param {Uint32Array} value - The input `Uint32Array` to convert.
 * @returns {Uint8Array} - The resulting `Uint8Array`, with length four times that of the input `Uint32Array`.
 *
 * @example
 * // Example 1: Converting a valid Uint32Array into a Uint8Array
 * const uint32Array = new Uint32Array([0x12345678, 0x9abcdef0]);
 * const uint8Array = uint32ToUint8(uint32Array);
 * console.log(uint8Array); // Output: Uint8Array [ 0x78, 0x56, 0x34, 0x12, 0xf0, 0xde, 0xbc, 0x9a ]
 *
 * @example
 * // Example 2: Another conversion example with different numbers
 * const uint32Array2 = new Uint32Array([0xffffffff, 0x00000000]);
 * const uint8Array2 = uint32ToUint8(uint32Array2);
 * console.log(uint8Array2); // Output: Uint8Array [ 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00 ]
 *
 * @example
 * // Example 3: Handling edge values
 * const uint32Array3 = new Uint32Array([0x0, 0x00000001]);
 * const uint8Array3 = uint32ToUint8(uint32Array3);
 * console.log(uint8Array3); // Output: Uint8Array [ 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00 ]
 *
 * @group Binary
 */
export function uint32ToUint8(value: Uint32Array): Uint8Array {
  const uint8Array = new Uint8Array(value.length * 4);
  for (let i = 0; i < value.length; i++) {
    uint8Array[i * 4] = value[i] & 0xff;
    uint8Array[i * 4 + 1] = (value[i] >> 8) & 0xff;
    uint8Array[i * 4 + 2] = (value[i] >> 16) & 0xff;
    uint8Array[i * 4 + 3] = (value[i] >> 24) & 0xff;
  }
  return uint8Array;
}
