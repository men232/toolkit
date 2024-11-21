import { describe, expect, it } from 'vitest';
import { BinaryReader } from './BinaryReader';
import { BinaryWriter } from './BinaryWriter';
import { CORE_TYPES } from './constants';

describe('tl-pack', () => {
  it('integration', () => {
    const writer = new BinaryWriter();

    const input = {
      null: null,
      uint8: 255,
      uint16: 256,
      uint32: 65536,
      int8: -128,
      int16: -32768,
      int32: -2147483648,
      double: 3.14,
      string: 'Hello world',
      vector: [1, 2, 3, 4, 5, { text: 'hi' }],
      map: { foo: 'bar' },
      date: new Date(),
    };

    writer.writeObject(input);

    const reader = new BinaryReader(writer.getBuffer());

    expect(input).toStrictEqual(reader.readObject());
  });

  it('dictionary', () => {
    const writer = new BinaryWriter();

    writer.writeMap({ t: false });
    writer.writeMap({ t: false });

    const buffer = writer.getBuffer();
    const reader = new BinaryReader(buffer);

    expect(Array.from(buffer)).toStrictEqual([
      CORE_TYPES.DictValue,
      1, // 't' length
      116, // 't' key
      CORE_TYPES.BoolFalse,
      CORE_TYPES.None,
      CORE_TYPES.DictIndex,
      0,
      CORE_TYPES.BoolFalse,
      CORE_TYPES.None,
    ]);

    expect(reader.readMap(false)).toStrictEqual({ t: false });
    expect(reader.readMap(false)).toStrictEqual({ t: false });
  });

  it('should handle valid checksum', () => {
    const writer = new BinaryWriter();

    writer.writeMap({ t: false });
    writer.writeChecksum();

    const buffer = writer.getBuffer();
    const reader = new BinaryReader(buffer);

    reader.readMap(false);

    expect(reader.readChecksum()).toBeUndefined();
  });

  it('should handle multiple checksum', () => {
    const writer = new BinaryWriter();

    writer.writeMap({ t: false });
    writer.writeChecksum();
    writer.writeMap({ t: false });
    writer.writeChecksum();

    const buffer = writer.getBuffer();
    const reader = new BinaryReader(buffer);

    reader.readMap(false);
    reader.readChecksum();
    reader.readMap(false);

    expect(reader.readChecksum()).toBeUndefined();
  });

  it('should handle invalid checksum', () => {
    const writer = new BinaryWriter();

    writer.writeMap({ t: false });
    writer.writeChecksum();

    const buffer = writer.getBuffer();

    buffer[6]++;

    const reader = new BinaryReader(buffer);

    reader.readMap(false);

    expect(() => reader.readChecksum()).toThrowError('checksum');
  });
});
