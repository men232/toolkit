import { describe, expect, it } from 'vitest';
import { uint16ToUint8 } from '../uint16ToUint8';
import { uint8ToUint16 } from './uint8ToUint16';

describe('uint8ToUint16', () => {
  it('should correctly convert Uint8Array to Uint16Array in little-endian order', () => {
    const uint8Array = new Uint8Array([0x34, 0x12, 0x78, 0x56, 0xbc, 0x9a]);
    const expected = new Uint16Array([0x1234, 0x5678, 0x9abc]);

    const result = uint8ToUint16(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should handle a simple conversion correctly', () => {
    const uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const expected = new Uint16Array([0x0201, 0x0403]);

    const result = uint8ToUint16(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should be the inverse of uint16ToUint8', () => {
    const value = new Uint16Array([0, 1, 258, 0xabcd, 0xffff]);

    expect(uint8ToUint16(uint16ToUint8(value))).toEqual(value);
  });

  it('should throw an error if Uint8Array length is odd', () => {
    const uint8Array = new Uint8Array([0x01, 0x02, 0x03]); // Length is odd

    expect(() => uint8ToUint16(uint8Array)).toThrowError(
      'Uint8Array length must be even for conversion to Uint16Array',
    );
  });
});
