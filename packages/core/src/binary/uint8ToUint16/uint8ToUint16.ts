import { assert } from '@/assert';

/**
 * Converts a Uint8Array to a Uint16Array.
 *
 * @param {Uint8Array} value - The input byte array to convert. Must have an even length.
 * @returns {Uint16Array} - The converted Uint16Array.
 *
 * @example
 * // Example 1: Converting a valid Uint8Array into a Uint16Array
 * const uint8Array = new Uint8Array([0x12, 0x34, 0x56, 0x78]);
 * const uint16Array = uint8ToUint16(uint8Array);
 * console.log(uint16Array); // Output: Uint16Array [ 0x1234, 0x5678 ]
 *
 * @example
 * // Example 2: Another conversion example
 * const uint8Array2 = new Uint8Array([0xff, 0xee, 0xdd, 0xcc]);
 * const uint16Array2 = uint8ToUint16(uint8Array2);
 * console.log(uint16Array2); // Output: Uint16Array [ 0xffee, 0xddcc ]
 *
 * @group Binary
 */
export function uint8ToUint16(value: Uint8Array): Uint16Array {
  assert.ok(
    value.length % 2 === 0,
    'Uint8Array length must be even for conversion to Uint16Array',
  );

  const uint16Array = new Uint16Array(value.length / 2);

  for (let i = 0; i < uint16Array.length; i++) {
    uint16Array[i] = (value[i * 2] << 8) | value[i * 2 + 1];
  }

  return uint16Array;
}
