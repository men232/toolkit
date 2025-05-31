export interface BaseX {
  /**
   * Base alphabet
   */
  alphabet: string;

  /**
   * Base padding chars
   */
  padding: string;

  /**
   * Encodes binary data into a BaseX string representation
   *
   * @param input - The binary data to encode
   * @returns The encoded string
   */
  encode(input: Uint8Array): string;

  /**
   * Decodes a baseX string back into binary data
   *
   * @param input - The encoded string to decode
   * @returns The decoded binary data
   * @throws {Error} When the input contains invalid characters or format
   */
  decode(input: string): Uint8Array;
}

/**
 * Create custom base alphabet encoding.
 *
 * @example
 * ```typescript
 * const base16 = basex('0123456789abcdef')
 * const data = new Uint8Array([255, 255]);
 * console.log(base16.encode(data));
 * ```
 *
 * @example
 * ```typescript
 * const base16 = basex('0123456789abcdef')
 * const encoded = "16FA";
 * console.log(base16.decode(encoded));
 * ```
 *
 * @group Binary
 */
export function basex(alphabet: string): BaseX {
  var BASE = BigInt(alphabet.length);
  var ZERO_CHAR = alphabet[0];
  var CHAR_INDEX: Record<string, number> = {};

  for (let idx = 0; idx < alphabet.length; idx++) {
    CHAR_INDEX[alphabet[idx]] = idx;
  }

  return {
    alphabet,
    padding: '',
    encode: encode,
    decode: decode,
  };

  function encode(input: Uint8Array): string {
    var value = 0n;
    var i = 0;
    var result: string[] = new Array((((input.length * 8) / 5) | 0) + 1);
    var pos = result.length;
    var leadingZeros = 0;
    var rem = 0n;

    for (i = 0; i < input.length; i++) {
      value = (value << 8n) + BigInt(input[i]);
    }

    while (value > 0) {
      rem = value % BASE;
      result[--pos] = alphabet[Number(rem)];
      value = value / BASE;
    }

    while (leadingZeros < input.length && input[leadingZeros] === 0) {
      result[--pos] = ZERO_CHAR;
      leadingZeros++;
    }

    return result.slice(pos).join('');
  }

  function decode(input: string): Uint8Array {
    var value = 0n;
    var leadingZeros = 0;
    var i = 0;
    var char = '';
    var index = 0;
    var bytes = new Uint8Array((input.length * 1.25) | 0);
    var pos = bytes.length;

    while (leadingZeros < input.length && input[leadingZeros] === ZERO_CHAR) {
      leadingZeros++;
    }

    for (i = leadingZeros; i < input.length; i++) {
      char = input[i];
      index = CHAR_INDEX[char];
      if (index === undefined) throw new Error('Invalid base62 character');
      value = value * BASE + BigInt(index);
    }

    while (value > 0) {
      bytes[--pos] = Number(value & 0xffn);
      value >>= 8n;
    }

    return bytes.subarray(pos - leadingZeros);
  }
}
