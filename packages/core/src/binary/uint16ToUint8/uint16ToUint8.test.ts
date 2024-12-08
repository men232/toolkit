import { describe, expect, it } from 'vitest';
import { uint16ToUint8 } from './uint16ToUint8';

describe('uint16ToUint8', () => {
  it('should correctly convert Uint16Array to Uint8Array in little-endian order', () => {
    const uint16Array = new Uint16Array([0x1234, 0x5678, 0x9abc]);
    const expected = new Uint8Array([0x34, 0x12, 0x78, 0x56, 0xbc, 0x9a]);

    const result = uint16ToUint8(uint16Array);

    expect(result).toEqual(expected);
  });

  it('should correctly handle a single value in Uint16Array', () => {
    const uint16Array = new Uint16Array([0xabcd]);
    const expected = new Uint8Array([0xcd, 0xab]);

    const result = uint16ToUint8(uint16Array);

    expect(result).toEqual(expected);
  });

  it('should return an empty Uint8Array when input is empty', () => {
    const uint16Array = new Uint16Array([]);
    const expected = new Uint8Array([]);

    const result = uint16ToUint8(uint16Array);

    expect(result).toEqual(expected);
  });
});
