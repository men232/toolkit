import { assert } from '@/assert';
import type { BaseX } from '../basex';

export class Base64Encoding implements BaseX {
  public alphabet: string;
  public padding: string;

  private decodeMap = new Map<string, number>();

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

    for (let i = 0; i < alphabet.length; i++) {
      this.decodeMap.set(alphabet[i]!, i);
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
    const includePadding = options?.includePadding ?? true;
    let result = '';
    let buffer = 0;
    let shift = 0;

    for (const byte of data) {
      buffer = (buffer << 8) | byte;
      shift += 8;
      while (shift >= 6) {
        shift -= 6;
        result += this.alphabet[(buffer >> shift) & 0x3f];
      }
    }

    if (shift > 0) {
      result += this.alphabet[(buffer << (6 - shift)) & 0x3f];
    }

    if (includePadding && this.padding) {
      const padCount = (4 - (result.length % 4)) % 4;
      result += '='.repeat(padCount);
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
    const strict = options?.strict ?? true;
    const result: number[] = [];
    let buffer = 0;
    let bitsCollected = 0;

    if (this.padding && strict) {
      assert.ok(data.length % 4 === 0, 'Invalid Base64 data');
    }

    for (const char of data) {
      if (char === this.padding) break;
      const value = this.decodeMap.get(char);
      if (value === undefined) {
        throw new Error(`Invalid Base64 character: ${char}`);
      }
      buffer = (buffer << 6) | value;
      bitsCollected += 6;

      if (bitsCollected >= 8) {
        bitsCollected -= 8;
        result.push((buffer >> bitsCollected) & 0xff);
      }
    }

    return Uint8Array.from(result);
  }
}
