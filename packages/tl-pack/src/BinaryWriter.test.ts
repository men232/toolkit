import { describe, expect, it } from 'vitest';
import { BinaryWriter } from './BinaryWriter';
import { CORE_TYPES } from './constants';

describe('BinaryWriter', () => {
  it('.writeBool(true)', () => {
    expect(new BinaryWriter().writeBool(true).getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.BoolTrue]),
    );
  });

  it('.writeBool(false)', () => {
    expect(new BinaryWriter().writeBool(false).getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.BoolFalse]),
    );
  });

  it('.writeByte()', () => {
    expect(new BinaryWriter().writeByte(128).getBuffer()).toStrictEqual(
      new Uint8Array([128]),
    );
  });

  it('.writeNull()', () => {
    expect(new BinaryWriter().writeNull().getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.Null]),
    );
  });

  it('.writeInt32()', () => {
    expect(new BinaryWriter().writeInt32(2147483647).getBuffer()).toStrictEqual(
      new Uint8Array([255, 255, 255, 127]),
    );
  });

  it('.writeInt16()', () => {
    expect(new BinaryWriter().writeInt16(32767).getBuffer()).toStrictEqual(
      new Uint8Array([255, 127]),
    );
  });

  it('.writeInt8()', () => {
    expect(new BinaryWriter().writeInt8(127).getBuffer()).toStrictEqual(
      new Uint8Array([127]),
    );
  });

  it('.writeFloat()', () => {
    expect(new BinaryWriter().writeFloat(256).getBuffer()).toStrictEqual(
      new Uint8Array([0, 0, 128, 67]),
    );
  });

  it('.writeDouble()', () => {
    expect(new BinaryWriter().writeDouble(256).getBuffer()).toStrictEqual(
      new Uint8Array([0, 0, 0, 0, 0, 0, 112, 64]),
    );
  });

  it('.writeDate()', () => {
    expect(new BinaryWriter().writeDate(1).getBuffer()).toStrictEqual(
      new Uint8Array([0, 0, 0, 0, 0, 0, 240, 63]),
    );
  });

  it('.writeBytes()', () => {
    expect(
      new BinaryWriter().writeBytes(new Uint8Array([127, 127])).getBuffer(),
    ).toStrictEqual(new Uint8Array([2, 127, 127]));
  });

  it('.writeLength(byte = 1)', () => {
    expect(new BinaryWriter().writeLength(253).getBuffer()).toStrictEqual(
      new Uint8Array([253]),
    );
  });

  it('.writeLength(byte = 4)', () => {
    expect(new BinaryWriter().writeLength(512).getBuffer()).toStrictEqual(
      new Uint8Array([254, 0, 2, 0]),
    );
  });

  it('.writeMap()', () => {
    expect(
      new BinaryWriter().writeMap({ a: 1, b: 1 }).getBuffer(),
    ).toStrictEqual(new Uint8Array([17, 1, 97, 13, 1, 17, 1, 98, 13, 1, 0]));
  });

  it('.wireDictionary()', () => {
    expect(new BinaryWriter().wireDictionary('a').getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.DictValue, 1, 97]),
    );
  });

  it('.startDynamicVector()', () => {
    expect(new BinaryWriter().startDynamicVector().getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.VectorDynamic]),
    );
  });

  it('.endDynamicVector()', () => {
    expect(new BinaryWriter().endDynamicVector().getBuffer()).toStrictEqual(
      new Uint8Array([CORE_TYPES.None]),
    );
  });

  describe('writeObject', () => {
    it('UInt8', () => {
      expect(new BinaryWriter().writeObject(0xff).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.UInt8, 255]),
      );
    });

    it('UInt16', () => {
      expect(new BinaryWriter().writeObject(0xffff).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.UInt16, 255, 255]),
      );
    });

    it('UInt32', () => {
      expect(
        new BinaryWriter().writeObject(0xffffffff).getBuffer(),
      ).toStrictEqual(new Uint8Array([CORE_TYPES.UInt32, 255, 255, 255, 255]));
    });

    it('Int8', () => {
      expect(new BinaryWriter().writeObject(-0x80).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.Int8, 128]),
      );
    });

    it('Int16', () => {
      expect(new BinaryWriter().writeObject(-0x8000).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.Int16, 0, 128]),
      );
    });

    it('Int32', () => {
      expect(
        new BinaryWriter().writeObject(-0x80000000).getBuffer(),
      ).toStrictEqual(new Uint8Array([CORE_TYPES.Int32, 0, 0, 0, 128]));
    });

    it('Bool(true)', () => {
      expect(new BinaryWriter().writeObject(true).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.BoolTrue]),
      );
    });

    it('Bool(false)', () => {
      expect(new BinaryWriter().writeObject(false).getBuffer()).toStrictEqual(
        new Uint8Array([CORE_TYPES.BoolFalse]),
      );
    });

    it('Date', () => {
      expect(
        new BinaryWriter().writeObject(new Date(0)).getBuffer(),
      ).toStrictEqual(
        new Uint8Array([CORE_TYPES.Date, 0, 0, 0, 0, 0, 0, 0, 0]),
      );
    });

    it('Double', () => {
      expect(new BinaryWriter().writeObject(0.01).getBuffer()).toStrictEqual(
        new Uint8Array([
          CORE_TYPES.Double,
          123,
          20,
          174,
          71,
          225,
          122,
          132,
          63,
        ]),
      );
    });
  });
});
