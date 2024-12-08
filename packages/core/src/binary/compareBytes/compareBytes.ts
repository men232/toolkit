/**
 * Compares two `Uint8Array` instances to check if their contents are identical.
 *
 * This function compares each byte of the two provided byte arrays. It returns `true`
 * only if both byte arrays are of the same length **and** contain identical byte values
 * at every index. Otherwise, it returns `false`.
 *
 * @param {Uint8Array} a - The first byte array to compare.
 * @param {Uint8Array} b - The second byte array to compare.
 * @returns {boolean} `true` if the byte arrays are identical; otherwise, `false`.
 *
 * @example
 * // Example with identical byte arrays
 * const a = new Uint8Array([1, 2, 3]);
 * const b = new Uint8Array([1, 2, 3]);
 * console.log(compareBytes(a, b)); // Output: true
 *
 * @example
 * // Example with different contents
 * const a = new Uint8Array([1, 2, 3]);
 * const b = new Uint8Array([1, 2, 4]);
 * console.log(compareBytes(a, b)); // Output: false
 *
 * @example
 * // Example with different lengths
 * const a = new Uint8Array([1, 2]);
 * const b = new Uint8Array([1, 2, 3]);
 * console.log(compareBytes(a, b)); // Output: false
 *
 * @example
 * // Example with both arrays empty
 * const a = new Uint8Array([]);
 * const b = new Uint8Array([]);
 * console.log(compareBytes(a, b)); // Output: true
 *
 * @group Binary
 */
export function compareBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.byteLength !== b.byteLength) {
    return false;
  }
  for (let i = 0; i < b.byteLength; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }
  return true;
}
