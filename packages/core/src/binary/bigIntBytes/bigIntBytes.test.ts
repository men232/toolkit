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
});
