import { describe, expect, it } from 'vitest';
import { BinaryReader } from './BinaryReader';
import { BinaryWriter } from './BinaryWriter';

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
});
