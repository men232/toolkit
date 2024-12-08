import { describe, expect, it } from 'vitest';
import { uint8ToUint32 } from './uint8ToUint32';

describe('uint8ToUint32', () => {
  it('should correctly convert Uint8Array to Uint32Array in big-endian order', () => {
    const uint8Array = new Uint8Array([
      0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
    ]);
    const expected = new Uint32Array([0x01020304, 0x05060708]);

    const result = uint8ToUint32(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should correctly process another Uint8Array sequence', () => {
    const uint8Array = new Uint8Array([
      0x00, 0xff, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66,
    ]);
    const expected = new Uint32Array([0x00ff1122, 0x33445566]);

    const result = uint8ToUint32(uint8Array);

    expect(result).toEqual(expected);
  });

  it('should throw an error if Uint8Array length is not a multiple of 4', () => {
    const uint8Array = new Uint8Array([0x01, 0x02, 0x03]); // Invalid length

    expect(() => uint8ToUint32(uint8Array)).toThrowError(
      'Uint8Array length must be a multiple of 4 for conversion to Uint32Array',
    );
  });

  it('should throw an error when Uint8Array length is an odd multiple', () => {
    const uint8Array = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9a]);

    expect(() => uint8ToUint32(uint8Array)).toThrowError(
      'Uint8Array length must be a multiple of 4 for conversion to Uint32Array',
    );
  });
});
