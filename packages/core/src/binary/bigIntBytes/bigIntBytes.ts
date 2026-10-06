const CODE = new Uint8Array(128);
for (let i = 0; i < 10; i++) CODE[48 + i] = i;
for (let i = 0; i < 6; i++) CODE[97 + i] = 10 + i;

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
  if (value < 0n) value = -value;

  if (value <= 0x1fffffffffffffn) return fromNumber(Number(value));

  return fromHex(value.toString(16));
}

function fromNumber(n: number): Uint8Array {
  var len = 1,
    t = n;
  while (t >= 256) {
    t = Math.floor(t / 256);
    len++;
  }

  var out = new Uint8Array(len);
  for (var i = len - 1; i >= 0; i--) {
    out[i] = n % 256;
    n = Math.floor(n / 256);
  }
  return out;
}

function fromHex(s: string): Uint8Array {
  var odd = s.length & 1,
    len = (s.length + odd) >> 1,
    out = new Uint8Array(len),
    i = 0,
    j = 0;

  if (odd) out[i++] = CODE[s.charCodeAt(j++)];

  for (; i < len; i++, j += 2) {
    out[i] = (CODE[s.charCodeAt(j)] << 4) | CODE[s.charCodeAt(j + 1)];
  }
  return out;
}
