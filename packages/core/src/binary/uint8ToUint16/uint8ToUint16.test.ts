import { describe, expect, it } from 'vitest';
import { uint8ToUint16 } from './uint8ToUint16';

describe('uint8ToUint16', () => {
  it('should correctly convert Uint8Array to Uint16Array in big-endian order', () => {
    const uint8Array = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
    const expected = new Uint16Array([0x1234, 0x5678, 0x9abc]);

    const result = uint8ToUint16(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should handle a simple conversion correctly', () => {
    const uint8Array = new Uint8Array([0x01, 0x02, 0x03, 0x04]);
    const expected = new Uint16Array([0x0102, 0x0304]);

    const result = uint8ToUint16(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should throw an error if Uint8Array length is odd', () => {
    const uint8Array = new Uint8Array([0x01, 0x02, 0x03]); // Length is odd

    expect(() => uint8ToUint16(uint8Array)).toThrowError(
      'Uint8Array length must be even for conversion to Uint16Array',
    );
  });
});
