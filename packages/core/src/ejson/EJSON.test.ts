import { describe, expect, it } from 'vitest';
import { EJSON, type EJSONType, createEJSON } from './index';

function makeStringifyTest(value: any, expected: any) {
  it('should stringify single value', () => {
    expect(EJSON.stringify(value)).toBe(JSON.stringify(expected));
  });

  it('should stringify nested value', () => {
    expect(EJSON.stringify({ value: new Set([value]) })).toBe(
      `{"value":{"$set":[${JSON.stringify(expected)}]}}`,
    );
  });
}

function makeParseTest(value: any, expected: any) {
  it('should parse single value', () => {
    expect(EJSON.parse(JSON.stringify(value))).toStrictEqual(expected);
  });

  it('should parse nested value', () => {
    expect(EJSON.parse(`{"value":[${JSON.stringify(value)}]}`)).toStrictEqual({
      value: [expected],
    });
  });
}

function bufferType(placeholder: string): EJSONType {
  return {
    placeholder,
    encode: value =>
      value instanceof Uint8Array ? Array.from(value) : undefined,
    decode: value => new Uint8Array(value),
  };
}

describe('EJSON', () => {
  it('should normalize vendor name (mimetype)', () => {
    const ejson = createEJSON();
    ejson.vendorName = 'Andrew L.';
    expect(ejson.mimetype).toBe('application/vnd.andrew.l+json');
  });

  it('should normalize vendor name with version (mimetype)', () => {
    const ejson = createEJSON();
    ejson.vendorName = 'myapi.v1';
    expect(ejson.mimetype).toBe('application/vnd.myapi.v1+json');
  });

  it('should default mimetype when vendor name not set', () => {
    const ejson = createEJSON();
    expect(ejson.mimetype).toBe('application/json');
  });

  describe('stringify', () => {
    describe('date', () => {
      makeStringifyTest(new Date(0), { $date: 0 });
    });

    describe('set', () => {
      makeStringifyTest(new Set([1, 2, 3]), { $set: [1, 2, 3] });
    });

    describe('map', () => {
      makeStringifyTest(
        new Map([
          ['key_1', 1],
          ['key_2', 2],
        ]),
        {
          $map: [
            ['key_1', 1],
            ['key_2', 2],
          ],
        },
      );
    });

    describe('regex', () => {
      makeStringifyTest(/test/gi, { $regex: { pattern: 'test', flags: 'gi' } });
    });

    describe('+infinity', () => {
      makeStringifyTest(Infinity, { $inf: 1 });
    });

    describe('-infinity', () => {
      makeStringifyTest(-Infinity, { $inf: -1 });
    });

    describe('bigint', () => {
      makeStringifyTest(0xffffffffffffffffn, { $bigint: '//////////8' });
    });

    describe('binary', () => {
      describe('uint8', () => {
        makeStringifyTest(new Uint8Array([0]), { $binary: 'AA==' });
      });

      describe('uint16', () => {
        makeStringifyTest(new Uint16Array([0xffff]), {
          $binary: { value: '//8=', bit: 16 },
        });
      });

      describe('uint32', () => {
        makeStringifyTest(new Uint32Array([0xffffffff]), {
          $binary: { value: '/////w==', bit: 32 },
        });
      });
    });
  });

  describe('parse', () => {
    describe('date', () => {
      makeParseTest({ $date: 0 }, new Date(0));
    });

    describe('+infinity', () => {
      makeParseTest({ $inf: 1 }, Infinity);
    });

    describe('-infinity', () => {
      makeParseTest({ $inf: 1 }, Infinity);
    });

    describe('regex', () => {
      makeParseTest({ $regex: { pattern: 'test', flags: 'gi' } }, /test/gi);
    });

    describe('binary', () => {
      describe('uint8', () => {
        makeParseTest({ $binary: 'AA==' }, new Uint8Array([0]));
      });

      describe('uint16', () => {
        makeParseTest(
          { $binary: { value: '//8=', bit: 16 } },
          new Uint16Array([0xffff]),
        );
      });

      describe('uint32', () => {
        makeParseTest(
          { $binary: { value: '/////w==', bit: 32 } },
          new Uint32Array([0xffffffff]),
        );
      });
    });

    describe('bigint', () => {
      makeParseTest({ $bigint: 'AA' }, 0n);
    });

    describe('set', () => {
      makeParseTest({ $set: [1, 2, 3] }, new Set([1, 2, 3]));
    });

    describe('map', () => {
      makeParseTest(
        {
          $map: [
            ['key_1', 1],
            ['key_2', 2],
            ['key_3', { $bigint: 'AA' }],
          ],
        },
        new Map<any, any>([
          ['key_1', 1],
          ['key_2', 2],
          ['key_3', 0n],
        ]),
      );
    });
  });

  describe('addType', () => {
    it('should reject already taken placeholder', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(() => ejson.addType(bufferType('$buffer'))).toThrow(
        'type with $buffer already taken.',
      );
    });

    it('should stringify custom type', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(ejson.stringify({ value: new Uint8Array([1, 2]) })).toBe(
        '{"value":{"$buffer":[1,2]}}',
      );
    });

    it('should parse custom type', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(ejson.parse('{"value":{"$buffer":[1,2]}}')).toStrictEqual({
        value: new Uint8Array([1, 2]),
      });
    });

    it('should keep unknown placeholders untouched', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(ejson.parse('{"value":{"$unknown":[1,2]}}')).toStrictEqual({
        value: { $unknown: [1, 2] },
      });
    });
  });

  describe('placeholderPrefix', () => {
    it('should default to "$"', () => {
      expect(createEJSON().placeholderPrefix).toBe('$');
    });

    it('should reject placeholder without any known prefix', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';

      expect(() => ejson.addType(bufferType('buffer'))).toThrow(
        'type placeholder must starts with "@"',
      );
    });

    it('should re-prefix a $ placeholder', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';
      ejson.addType(bufferType('$buffer'));

      expect(ejson.stringify({ value: new Uint8Array([1, 2]) })).toBe(
        '{"value":{"@buffer":[1,2]}}',
      );
      expect(ejson.parse('{"value":{"@buffer":[1,2]}}')).toStrictEqual({
        value: new Uint8Array([1, 2]),
      });
    });

    it('should re-prefix built-in types', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '_';
      ejson.addType(EJSON.Type.Date);

      expect(ejson.stringify({ at: new Date(0) })).toBe('{"at":{"_date":0}}');
      expect(ejson.parse('{"at":{"_date":0}}')).toStrictEqual({
        at: new Date(0),
      });
    });

    it('should report the resolved placeholder as taken', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';
      ejson.addType(bufferType('$buffer'));

      expect(() => ejson.addType(bufferType('@buffer'))).toThrow(
        'type with @buffer already taken.',
      );
    });

    it('should reject placeholder equal to the prefix', () => {
      const ejson = createEJSON();

      expect(() => ejson.addType(bufferType('$'))).toThrow(
        'type placeholder must starts with "$"',
      );
    });

    it('should accept multi char prefix', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '__';

      expect(() => ejson.addType(bufferType('__buffer'))).not.toThrow();
      expect(() => ejson.addType(bufferType('_buffer'))).toThrow(
        'type placeholder must starts with "__"',
      );
    });

    it('should stringify with custom prefix', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';
      ejson.addType(bufferType('@buffer'));

      expect(ejson.stringify({ value: new Uint8Array([1, 2]) })).toBe(
        '{"value":{"@buffer":[1,2]}}',
      );
    });

    it('should parse with custom prefix', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';
      ejson.addType(bufferType('@buffer'));

      expect(ejson.parse('{"value":{"@buffer":[1,2]}}')).toStrictEqual({
        value: new Uint8Array([1, 2]),
      });
    });

    it('should keep objects with a foreign prefix untouched', () => {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '@';
      ejson.addType(bufferType('@buffer'));

      expect(ejson.parse('{"value":{"$buffer":[1,2]}}')).toStrictEqual({
        value: { $buffer: [1, 2] },
      });
    });

    it('should reject prefix change after types were added', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(() => {
        ejson.placeholderPrefix = '@';
      }).toThrow('placeholderPrefix cannot be changed after types were added.');
    });

    it('should allow assigning the same prefix after types were added', () => {
      const ejson = createEJSON();
      ejson.addType(bufferType('$buffer'));

      expect(() => {
        ejson.placeholderPrefix = '$';
      }).not.toThrow();
    });

    it('should reject an empty prefix', () => {
      const ejson = createEJSON();

      expect(() => {
        ejson.placeholderPrefix = '';
      }).toThrow('placeholderPrefix must be a non-empty string.');
    });
  });
});
