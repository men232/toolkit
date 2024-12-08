import { describe, expect, it } from 'vitest';
import { uint32ToUint8 } from './uint32ToUint8';

describe('uint32ToUint8', () => {
  it('should correctly convert Uint32Array to Uint8Array in little-endian order', () => {
    const uint32Array = new Uint32Array([0x12345678, 0x9abcdef0]);
    const expected = new Uint8Array([
      0x78, 0x56, 0x34, 0x12, 0xf0, 0xde, 0xbc, 0x9a,
    ]);

    const result = uint32ToUint8(uint32Array);

    expect(result).toEqual(expected);
  });

  it('should correctly handle a single 32-bit number in Uint32Array', () => {
    const uint32Array = new Uint32Array([0x0a0b0c0d]);
    const expected = new Uint8Array([0x0d, 0x0c, 0x0b, 0x0a]);

    const result = uint32ToUint8(uint32Array);

    expect(result).toEqual(expected);
  });

  it('should return an empty Uint8Array when input is empty', () => {
    const uint32Array = new Uint32Array([]);
    const expected = new Uint8Array([]);

    const result = uint32ToUint8(uint32Array);

    expect(result).toEqual(expected);
  });
});
