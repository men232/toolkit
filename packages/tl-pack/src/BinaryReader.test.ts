import { describe, expect, it } from 'vitest';
import { BinaryReader } from './BinaryReader';
import { CORE_TYPES } from './constants';

describe('BinaryReader', () => {
  const decode = (values: number[]): BinaryReader =>
    new BinaryReader(new Uint8Array(values));

  it('.readBool(true)', () => {
    expect(decode([CORE_TYPES.BoolTrue]).readBool()).toBe(true);
  });

  it('.readBool(false)', () => {
    expect(decode([CORE_TYPES.BoolFalse]).readBool()).toBe(false);
  });

  it('.readByte()', () => {
    expect(decode([128]).readByte()).toBe(128);
  });

  it('.readNull()', () => {
    expect(decode([CORE_TYPES.Null]).readNull()).toBe(null);
  });

  it('.readInt32()', () => {
    expect(decode([255, 255, 255, 127]).readInt32()).toBe(2147483647);
  });

  it('.readInt64()', () => {
    expect(decode([255, 255, 255, 127, 0, 0, 0, 0]).readInt64()).toBe(
      2147483647n,
    );
  });

  it('.readInt16()', () => {
    expect(decode([255, 127]).readInt16()).toBe(32767);
  });

  it('.writeInt8()', () => {
    expect(decode([127]).readInt8()).toBe(127);
  });

  it('.readFloat()', () => {
    expect(decode([0, 0, 128, 67]).readFloat()).toBe(256);
  });

  it('.readDouble()', () => {
    expect(decode([0, 0, 0, 0, 0, 0, 240, 63]).readDouble()).toBe(1);
  });

  it('.readBytes()', () => {
    expect(decode([2, 127, 127]).readBytes()).toStrictEqual(
      new Uint8Array([127, 127]),
    );
  });

  it('.readLength(byte = 1)', () => {
    expect(decode([253]).readLength()).toBe(253);
  });

  it('.readLength(byte = 4)', () => {
    expect(decode([254, 0, 2, 0]).readLength()).toBe(512);
  });

  it('.readMap()', () => {
    expect(
      decode([17, 1, 97, 13, 1, 17, 1, 98, 13, 1, 0]).readMap(false),
    ).toStrictEqual({ a: 1, b: 1 });
  });

  it('.readDictionary()', () => {
    expect(decode([CORE_TYPES.DictValue, 1, 97]).readDictionary()).toBe('a');
  });

  describe('readObject', () => {
    it('Uint8', () => {
      expect(decode([CORE_TYPES.UInt8, 255]).readObject()).toBe(0xff);
    });

    it('UInt16', () => {
      expect(decode([CORE_TYPES.UInt16, 255, 255]).readObject()).toBe(0xffff);
    });

    it('UInt32', () => {
      expect(decode([CORE_TYPES.UInt32, 255, 255, 255, 255]).readObject()).toBe(
        0xffffffff,
      );
    });

    it('UInt64', () => {
      expect(
        decode([CORE_TYPES.UInt64, 0, 0, 0, 128, 0, 0, 0, 0]).readObject(),
      ).toBe(0x80000000n);
    });

    it('Int8', () => {
      expect(decode([CORE_TYPES.Int8, 128]).readObject()).toBe(-0x80);
    });

    it('Int16', () => {
      expect(decode([CORE_TYPES.Int16, 0, 128]).readObject()).toBe(-0x8000);
    });

    it('Int32', () => {
      expect(decode([CORE_TYPES.Int32, 0, 0, 0, 128]).readObject()).toBe(
        -0x80000000,
      );
    });

    it('Int64', () => {
      expect(
        decode([
          CORE_TYPES.Int64,
          0,
          0,
          0,
          128,
          255,
          255,
          255,
          255,
        ]).readObject(),
      ).toBe(-0x80000000n);
    });

    it('Bool(true)', () => {
      expect(decode([CORE_TYPES.BoolTrue]).readObject()).toBe(true);
    });

    it('Bool(false)', () => {
      expect(decode([CORE_TYPES.BoolFalse]).readObject()).toBe(false);
    });

    it('Date', () => {
      expect(
        decode([CORE_TYPES.Date, 0, 0, 0, 0, 0, 0, 0, 0]).readObject(),
      ).toStrictEqual(new Date(0));
    });

    it('Double', () => {
      expect(
        decode([
          CORE_TYPES.Double,
          123,
          20,
          174,
          71,
          225,
          122,
          132,
          63,
        ]).readObject(),
      ).toBe(0.01);
    });
  });
});
