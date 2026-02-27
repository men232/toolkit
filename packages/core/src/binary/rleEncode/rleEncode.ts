/**
 * Run-length encode a buffer, compressing runs of a specific byte value.
 *
 * Runs of `value` are encoded as [value, count] pairs (count ≤ 255).
 * All other bytes pass through unchanged.
 *
 * @param buf - Input buffer to encode
 * @param value - Byte value to compress runs of (default: 0)
 * @returns RLE-encoded buffer
 * @group Binary
 */
export function rleEncode(buf: Uint8Array, value = 0): Uint8Array {
  const result: number[] = [];
  let i = 0;

  while (i < buf.length) {
    if (buf[i] === value) {
      const runStart = i;
      while (i < buf.length && buf[i] === value) {
        i++;
      }
      let runLength = i - runStart;

      // Encode runs in chunks of 255 (max single-byte count)
      while (runLength > 0) {
        const chunk = Math.min(runLength, 255);
        result.push(value, chunk);
        runLength -= chunk;
      }
    } else {
      result.push(buf[i]);
      i++;
    }
  }

  return new Uint8Array(result);
}
