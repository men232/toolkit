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

  describe('reset', () => {
    it('complete test', () => {
      const buf = new Uint8Array([
        16, 17, 4, 110, 117, 108, 108, 4, 17, 5, 117, 105, 110, 116, 56, 13,
        255, 17, 6, 117, 105, 110, 116, 49, 54, 12, 0, 1, 17, 6, 117, 105, 110,
        116, 51, 50, 11, 0, 0, 1, 0, 17, 6, 117, 105, 110, 116, 54, 52, 23, 255,
        255, 255, 255, 255, 255, 255, 255, 17, 4, 105, 110, 116, 56, 10, 128,
        17, 5, 105, 110, 116, 49, 54, 9, 0, 128, 17, 5, 105, 110, 116, 51, 50,
        8, 0, 0, 0, 128, 17, 5, 105, 110, 116, 54, 52, 22, 156, 255, 255, 255,
        255, 255, 255, 255, 17, 6, 100, 111, 117, 98, 108, 101, 15, 31, 133,
        235, 81, 184, 30, 9, 64, 17, 6, 115, 116, 114, 105, 110, 103, 17, 11,
        72, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100, 17, 6, 118, 101,
        99, 116, 111, 114, 6, 10, 13, 1, 13, 2, 13, 3, 13, 4, 13, 5, 17, 1, 97,
        17, 1, 98, 17, 3, 99, 99, 99, 20, 1, 16, 17, 4, 116, 101, 120, 116, 17,
        2, 104, 105, 0, 17, 3, 109, 97, 112, 16, 17, 3, 102, 111, 111, 17, 3,
        98, 97, 114, 18, 20, 16, 18, 19, 18, 20, 0, 0, 17, 4, 100, 97, 116, 101,
        5, 0, 144, 143, 147, 249, 125, 121, 66, 0,
      ]);

      const r = new BinaryReader(buf);
      const obj1 = r.readObject();
      r.reset();
      const obj2 = r.readObject();
      r.reset(buf);
      const obj3 = r.readObject();

      expect(obj1).toStrictEqual(obj2);
      expect(obj2).toStrictEqual(obj3);
    });
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
