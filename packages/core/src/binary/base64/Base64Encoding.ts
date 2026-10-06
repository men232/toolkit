import { assert } from '@/assert';
import type { BaseX } from '../basex';

export class Base64Encoding implements BaseX {
  public alphabet: string;
  public padding: string;

  private codes: Int16Array;
  private pairs: string[] | undefined;

  constructor(
    alphabet: string,
    options?: {
      padding?: string;
    },
  ) {
    if (alphabet.length !== 64) {
      throw new Error('Invalid alphabet');
    }
    this.alphabet = alphabet;
    this.padding = options?.padding ?? '=';

    if (this.padding) {
      assert.ok(
        !this.alphabet.includes(this.padding),
        'Padding cannot be a part of alphabet',
      );
      assert.ok(this.padding.length === 1, 'Padding length must be a 1');
    }

    let maxCode = 0;

    for (let i = 0; i < alphabet.length; i++) {
      maxCode = Math.max(maxCode, alphabet.charCodeAt(i));
    }

    this.codes = new Int16Array(maxCode + 1).fill(-1);

    for (let i = 0; i < alphabet.length; i++) {
      this.codes[alphabet.charCodeAt(i)] = i;
    }
  }

  /**
   * Encodes binary data into a base64 string representation
   *
   * @param input - The binary data to encode
   * @returns The encoded string
   *
   * @example
   * ```typescript
   * const data = new Uint8Array([255, 255]);
   * console.log(base64.encode(data));
   * ```
   */
  public encode(
    data: Uint8Array,
    options?: {
      includePadding?: boolean;
    },
  ): string {
    var includePadding = options?.includePadding ?? true;
    var alphabet = this.alphabet;
    var pairs = this.pairs ?? (this.pairs = buildPairs(alphabet));
    var pad = includePadding ? this.padding : '';
    var len = data.length;
    var end = len - (len % 3);
    var result = '';
    var i = 0;
    var n;

    for (; i < end; i += 3) {
      n = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      result += pairs[n >> 12] + pairs[n & 4095];
    }

    if (len - end === 1) {
      n = data[i] << 16;
      result += pairs[n >> 12] + pad + pad;
    } else if (len - end === 2) {
      n = (data[i] << 16) | (data[i + 1] << 8);
      result += pairs[n >> 12] + alphabet[(n >> 6) & 63] + pad;
    }

    return result;
  }

  /**
   * Decodes a base64 string back into binary data
   *
   * @param input - The encoded string to decode
   * @returns The decoded binary data
   * @throws {Error} When the input contains invalid characters or format
   *
   * @example
   * ```typescript
   * const encoded = "AA==";
   * console.log(base64.decode(encoded)); // Uint8Array [255, 255]
   * ```
   */
  public decode(
    data: string,
    options?: {
      strict?: boolean;
    },
  ): Uint8Array {
    var strict = options?.strict ?? true;

    if (this.padding && strict) {
      assert.ok(data.length % 4 === 0, 'Invalid Base64 data');
    }

    var codes = this.codes;
    var end = this.padding ? data.indexOf(this.padding) : -1;

    if (end === -1) end = data.length;

    var out = new Uint8Array((end * 3) >> 2);
    var full = end - (end & 3);
    var i = 0;
    var j = 0;
    var a, b, c, d;

    for (; i < full; i += 4) {
      a = lookup(codes, data, i);
      b = lookup(codes, data, i + 1);
      c = lookup(codes, data, i + 2);
      d = lookup(codes, data, i + 3);
      out[j++] = (a << 2) | (b >> 4);
      out[j++] = ((b & 15) << 4) | (c >> 2);
      out[j++] = ((c & 3) << 6) | d;
    }

    var rest = end - full;

    if (rest >= 2) {
      a = lookup(codes, data, i);
      b = lookup(codes, data, i + 1);
      out[j++] = (a << 2) | (b >> 4);

      if (rest === 3) {
        c = lookup(codes, data, i + 2);
        out[j++] = ((b & 15) << 4) | (c >> 2);
      }
    } else if (rest === 1) {
      lookup(codes, data, i);
    }

    return out;
  }
}

function buildPairs(alphabet: string): string[] {
  var pairs = new Array<string>(4096);

  for (var i = 0; i < 4096; i++) {
    pairs[i] = alphabet[i >> 6] + alphabet[i & 63];
  }

  return pairs;
}

function lookup(codes: Int16Array, data: string, index: number): number {
  var code = data.charCodeAt(index);
  var value = code < codes.length ? codes[code] : -1;

  if (value < 0) {
    throw new Error(`Invalid Base64 character: ${data[index]}`);
  }

  return value;
}
