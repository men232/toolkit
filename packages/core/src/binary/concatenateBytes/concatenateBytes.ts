/**
 * Concatenates two `Uint8Array` instances into a single new `Uint8Array`.
 *
 * This function takes two byte arrays, `a` and `b`, and creates a new `Uint8Array`
 * that combines their contents in order. The result will have a length equal to the
 * sum of the lengths of `a` and `b`.
 *
 * @param {Uint8Array} a - The first byte array to concatenate.
 * @param {Uint8Array} b - The second byte array to concatenate.
 * @returns {Uint8Array} A new `Uint8Array` containing the concatenation of `a` and `b`.
 *
 * @example
 * // Example with simple byte arrays
 * const a = new Uint8Array([1, 2, 3]);
 * const b = new Uint8Array([4, 5, 6]);
 * const result = concatenateBytes(a, b);
 * console.log(result); // Output: Uint8Array(6) [1, 2, 3, 4, 5, 6]
 *
 * @example
 * // Example with empty arrays
 * const a = new Uint8Array([]);
 * const b = new Uint8Array([1, 2, 3]);
 * const result = concatenateBytes(a, b);
 * console.log(result); // Output: Uint8Array(3) [1, 2, 3]
 *
 * @example
 * // Example with reversed order
 * const a = new Uint8Array([10, 20]);
 * const b = new Uint8Array([30, 40]);
 * const result = concatenateBytes(a, b);
 * console.log(result); // Output: Uint8Array(4) [10, 20, 30, 40]
 *
 * @group Binary
 */
export function concatenateBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const result = new Uint8Array(a.byteLength + b.byteLength);
  result.set(a);
  result.set(b, a.byteLength);
  return result;
}
