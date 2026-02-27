/**
 * Decode a run-length encoded buffer.
 *
 * Decodes `[value, count]` pairs back into runs of `value`.
 * All other bytes pass through unchanged.
 *
 * @param buf - RLE-encoded buffer to decode
 * @param value - Byte value that was compressed (default: 0)
 * @returns Decoded buffer
 * @group Binary
 */
export function rleDecode(buf: Uint8Array, value = 0): Uint8Array {
  const result: number[] = [];
  let i = 0;

  while (i < buf.length) {
    if (buf[i] === value) {
      const count = buf[i + 1];
      for (let j = 0; j < count; j++) {
        result.push(value);
      }
      i += 2;
    } else {
      result.push(buf[i]);
      i++;
    }
  }

  return new Uint8Array(result);
}
