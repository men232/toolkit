import { assert } from '@/assert';

/**
 * Converts a `Uint8Array` into a `Uint32Array`.
 *
 * @param {Uint8Array} value - The input byte array to convert. Length must be a multiple of 4.
 * @returns {Uint32Array} - The converted array of 32-bit unsigned integers.
 *
 * @example
 * // Example 1: Converting a valid Uint8Array into a Uint32Array
 * const uint8Array = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0]);
 * const uint32Array = uint8ToUint32(uint8Array);
 * console.log(uint32Array); // Output: Uint32Array [ 0x78563412, 0xf0debc9a ]
 *
 * @example
 * // Example 2: Another conversion example
 * const uint8Array2 = new Uint8Array([0xff, 0xee, 0xdd, 0xcc, 0xab, 0xcd, 0xef, 0x01]);
 * const uint32Array2 = uint8ToUint32(uint8Array2);
 * console.log(uint32Array2); // Output: Uint32Array [ 0xccddeeff, 0x01abcded ]
 *
 *  @group Binary
 */
export function uint8ToUint32(value: Uint8Array): Uint32Array {
  assert.ok(
    value.length % 4 === 0,
    'Uint8Array length must be a multiple of 4 for conversion to Uint32Array',
  );

  const uint32Array = new Uint32Array(value.length / 4);
  for (let i = 0; i < uint32Array.length; i++) {
    uint32Array[i] =
      (value[i * 4] << 24) |
      (value[i * 4 + 1] << 16) |
      (value[i * 4 + 2] << 8) |
      value[i * 4 + 3];
  }

  return uint32Array;
}
