import { describe, expect, it } from 'vitest';
import { bigIntBytes } from './bigIntBytes';

describe('bigIntBytes', () => {
  it('converts a small positive bigint to Uint8Array', () => {
    const input = 0x1234n;
    const expected = new Uint8Array([0x12, 0x34]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('converts a large positive bigint to Uint8Array', () => {
    const input = 0x123456789abcdef0n;
    const expected = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
    ]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('converts 0n to a single byte Uint8Array', () => {
    const input = 0n;
    const expected = new Uint8Array([0x00]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('handles a single-byte bigint', () => {
    const input = 0x7fn;
    const expected = new Uint8Array([0x7f]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('handles a negative bigint', () => {
    const input = -0x1234n;
    const expected = new Uint8Array([0x12, 0x34]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('handles a large negative bigint', () => {
    const input = -0x123456789abcdef0n;
    const expected = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
    ]);
    expect(bigIntBytes(input)).toEqual(expected);
  });

  it('correctly calculates byte length for large bigints', () => {
    const input = 0xffffffffffffffffn; // Maximum 64-bit unsigned integer
    const expected = new Uint8Array([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);
    expect(bigIntBytes(input)).toEqual(expected);
  });
  it('matches a reference encoder for random values', () => {
    for (let len = 1; len <= 70; len++) {
      let value = BigInt(1 + ((Math.random() * 255) | 0));
      for (let i = 1; i < len; i++)
        value = (value << 8n) | BigInt((Math.random() * 256) | 0);

      const expected = new Uint8Array(len);
      for (let i = len - 1, v = value; i >= 0; i--, v >>= 8n)
        expected[i] = Number(v & 0xffn);

      expect(bigIntBytes(value)).toEqual(expected);
      expect(bigIntBytes(-value)).toEqual(expected);
    }
  });

  it('handles values around the safe integer boundary', () => {
    for (const value of [
      2n ** 53n - 1n,
      2n ** 53n,
      2n ** 53n + 1n,
      2n ** 56n - 1n,
      2n ** 56n,
    ]) {
      const hex = value
        .toString(16)
        .padStart(Math.ceil(value.toString(16).length / 2) * 2, '0');
      const expected = Uint8Array.from(hex.match(/../g)!, h => parseInt(h, 16));
      expect(bigIntBytes(value)).toEqual(expected);
    }
  });

  it('encodes large values in linear time', () => {
    const value = (1n << 800_000n) - 1n;
    const start = performance.now();
    const bytes = bigIntBytes(value);
    expect(performance.now() - start).toBeLessThan(100);
    expect(bytes.length).toBe(100_000);
    expect(bytes.every(b => b === 0xff)).toBe(true);
  });
});
