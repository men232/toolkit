var ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
var ENCODE_TABLE = new TextEncoder().encode(ALPHABET);

var DECODE_TABLE = new Uint8Array(256);
for (let i = 0; i < ENCODE_TABLE.length; ++i) {
  DECODE_TABLE[ENCODE_TABLE[i]] = i;
}

var LOG2_TABLE: Uint8Array = new Uint8Array(62);
for (let i = 0; i < 62; ++i) LOG2_TABLE[i] = Math.ceil(Math.log2(i + 1));

const allocEncode = createAllocator();

/**
 * Base62-like encoder/decoder for binary data
 *
 * @example Basic usage
 * ```typescript
 * const data = new Uint8Array([255, 128, 64]);
 * const encoded = base62.encode(data);
 * console.log(encoded);
 *
 * const decoded = base62.decode(encoded);
 * console.log(decoded); // Uint8Array [255, 128, 64]
 * ```
 *
 * @example Text encoding
 * ```typescript
 * const text = "Hello World!";
 * const bytes = new TextEncoder().encode(text);
 * const encoded = base62.encode(bytes);
 * const decoded = base62.decode(encoded);
 * const result = new TextDecoder().decode(decoded);
 * console.log(result); // "Hello World!"
 * ```
 *
 * @group Binary
 */
export const base62 = {
  alphabet: ALPHABET,
  padding: '',

  /**
   * Encodes binary data into a base62-like string representation
   *
   * Uses variable-length bit packing:
   * - Normally uses 6-bit chunks
   * - Uses 5-bit chunks when the value has pattern 0x1e (30) in lower 5 bits
   *
   * @param input - The binary data to encode
   * @returns The encoded string
   *
   * @example
   * ```typescript
   * const data = new Uint8Array([255, 255]);
   * console.log(base62.encode(data)); // "zzz"
   * ```
   */
  encode(input: Uint8Array): string {
    var position = input.length * 8;
    var output: Uint8Array = allocEncode(((position / 5) | 0) + 1);
    var outputIndex = 0;
    var chunkSize, remainderBits, byteIndex, extractedBits, bits;

    while (position > 0) {
      chunkSize = 6;

      remainderBits = position & 7;
      byteIndex = position >>> 3;

      if (remainderBits === 0) {
        byteIndex -= 1;
        remainderBits = 8;
      }

      extractedBits = input[byteIndex] >> (8 - remainderBits);

      if (remainderBits < 6 && byteIndex > 0)
        extractedBits |= input[byteIndex - 1] << remainderBits;

      bits = extractedBits & 0x3f;

      if ((bits & 0x1e) === 0x1e) {
        if (position > 6 || bits > 0x1f) chunkSize = 5;

        bits &= 0x1f;
      }

      output[outputIndex++] = ENCODE_TABLE[bits];
      position -= chunkSize;
    }

    return new TextDecoder().decode(output.subarray(0, outputIndex));
  },

  /**
   * Decodes a base62-like string back into binary data
   *
   * Reconstructs the original binary data by reversing the variable-length
   * bit packing used during encoding.
   *
   * @param input - The encoded string to decode
   * @returns The decoded binary data
   * @throws {Error} When the input contains invalid characters or format
   *
   * @example
   * ```typescript
   * const encoded = "zzz";
   * console.log(base62.decode(encoded)); // Uint8Array [255, 255]
   * ```
   */
  decode(input: string): Uint8Array {
    var inputLength = input.length;

    var maxOutputLength = ((inputLength * 6) / 8) | 0;
    var output = new Uint8Array(maxOutputLength);

    var writeIndex = maxOutputLength;
    var bitPosition = 0;
    var buffer = 0;
    var charCode = 0;
    var value = 0;

    for (var readIndex = 0; readIndex < inputLength; readIndex++) {
      charCode = input.charCodeAt(readIndex);
      value = DECODE_TABLE[charCode];

      if (isNaN(charCode) || value === undefined) {
        throw new Error('invalid input 2');
      }

      buffer |= value << bitPosition;

      if (readIndex === inputLength - 1) {
        if (LOG2_TABLE[value] === undefined) {
          throw new Error('invalid input');
        }

        bitPosition += LOG2_TABLE[value];
      } else if ((value & 0x1e) === 0x1e) {
        bitPosition += 5;
      } else {
        bitPosition += 6;
      }

      if (bitPosition >= 8) {
        output[--writeIndex] = buffer;
        bitPosition &= 7;
        buffer >>= 8;
      }
    }

    if (bitPosition > 0) output[--writeIndex] = buffer;

    return output.slice(writeIndex);
  },
};

function createAllocator(): (size: number) => Uint8Array {
  var currentBuffer = new Uint8Array(512);
  var currentSize = 512;

  return (size: number) => {
    if (currentSize < size) {
      currentBuffer = new Uint8Array(size);
      currentSize = size;
    }

    return currentBuffer;
  };
}
