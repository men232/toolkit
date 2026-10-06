import { describe, expect, it } from 'vitest';
import { bigIntFromBytes } from './bigIntFromBytes';

describe('bigIntFromBytes', () => {
  it('converts a Uint8Array to a positive bigint', () => {
    const input = new Uint8Array([0x12, 0x34]);
    const expected = 0x1234n;
    expect(bigIntFromBytes(input)).toBe(expected);
  });

  it('converts a large Uint8Array to a bigint', () => {
    const input = new Uint8Array([
      0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc, 0xde, 0xf0,
    ]);
    const expected = 0x123456789abcdef0n;
    expect(bigIntFromBytes(input)).toBe(expected);
  });

  it('converts a single-byte Uint8Array to a bigint', () => {
    const input = new Uint8Array([0x7f]);
    const expected = 0x7fn;
    expect(bigIntFromBytes(input)).toBe(expected);
  });

  it('handles a Uint8Array with leading zeros', () => {
    const input = new Uint8Array([0x00, 0x00, 0x01]);
    const expected = 0x01n;
    expect(bigIntFromBytes(input)).toBe(expected);
  });

  it('throws an error for an empty Uint8Array', () => {
    const input = new Uint8Array([]);
    expect(() => bigIntFromBytes(input)).toThrow('Empty Uint8Array');
  });

  it('converts a maximum Uint8Array to a bigint', () => {
    const input = new Uint8Array([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
    ]);
    const expected = 0xffffffffffffffffn;
    expect(bigIntFromBytes(input)).toBe(expected);
  });

  it('converts a Uint8Array of zeros to 0n', () => {
    const input = new Uint8Array([0x00, 0x00, 0x00]);
    const expected = 0n;
    expect(bigIntFromBytes(input)).toBe(expected);
  });
  it('matches a reference decoder for random lengths', () => {
    for (let len = 1; len <= 70; len++) {
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) bytes[i] = (Math.random() * 256) | 0;

      let expected = 0n;
      for (let i = 0; i < len; i++)
        expected = (expected << 8n) | BigInt(bytes[i]);

      expect(bigIntFromBytes(bytes)).toBe(expected);
    }
  });

  it('decodes large inputs in linear time', () => {
    const bytes = new Uint8Array(100_000).fill(0xff);
    const start = performance.now();
    const value = bigIntFromBytes(bytes);
    expect(performance.now() - start).toBeLessThan(100);
    expect(value).toBe((1n << 800_000n) - 1n);
  });
});
