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

  describe('encode / decode', () => {
    class ObjectIdLike {
      constructor(public readonly hex: string) {}
      toHexString() {
        return this.hex;
      }
    }

    function createMongoLike() {
      const ejson = createEJSON();
      ejson.placeholderPrefix = '__@';
      ejson.addType(EJSON.Type.Error);
      ejson.addType(EJSON.Type.Map);
      ejson.addType(EJSON.Type.Set);
      return ejson;
    }

    it('should keep unregistered instances as the same references', () => {
      const ejson = createEJSON();
      ejson.addType(EJSON.Type.Error);

      const at = new Date(0);
      const id = new ObjectIdLike('0123456789abcdef01234567');
      const buf = Buffer.from('x');
      const big = 10n;

      const encoded = ejson.encode({ at, id, buf, big }) as any;

      expect(encoded.at).toBe(at);
      expect(encoded.id).toBe(id);
      expect(encoded.buf).toBe(buf);
      expect(encoded.big).toBe(big);
    });

    it('should keep unregistered instances as the same references on decode', () => {
      const ejson = createEJSON();
      ejson.addType(EJSON.Type.Error);

      const at = new Date(0);
      const id = new ObjectIdLike('0123456789abcdef01234567');
      const buf = Buffer.from('x');

      const decoded = ejson.decode<any>({ nested: [{ at, id, buf }] });

      expect(decoded.nested[0].at).toBe(at);
      expect(decoded.nested[0].id).toBe(id);
      expect(decoded.nested[0].buf).toBe(buf);
    });

    it('should not touch the input object', () => {
      const ejson = createEJSON(true);
      const input = { list: [new Date(0)], nested: { set: new Set([1]) } };
      const encoded = ejson.encode(input) as any;

      expect(encoded).not.toBe(input);
      expect(encoded.list).not.toBe(input.list);
      expect(input.list[0]).toBeInstanceOf(Date);
      expect(input.nested.set).toBeInstanceOf(Set);
    });

    describe('error', () => {
      it('should encode error to a placeholder without stack', () => {
        const ejson = createEJSON();
        ejson.addType(EJSON.Type.Error);

        expect(ejson.encode(new TypeError('boom'))).toStrictEqual({
          $error: { name: 'TypeError', message: 'boom' },
        });
      });

      it('should encode cause recursively', () => {
        const ejson = createEJSON(true);
        ejson.addType(EJSON.Type.Error);

        const err = new Error('outer', {
          cause: new Error('inner', { cause: { at: new Date(0) } }),
        });

        expect(ejson.encode(err)).toStrictEqual({
          $error: {
            name: 'Error',
            message: 'outer',
            cause: {
              $error: {
                name: 'Error',
                message: 'inner',
                cause: { at: { $date: 0 } },
              },
            },
          },
        });
      });

      it('should restore error nested in objects and arrays', () => {
        const ejson = createEJSON();
        ejson.addType(EJSON.Type.Error);

        class MyError extends Error {
          name = 'MyError';
        }

        const input = {
          failed: new MyError('nested'),
          list: [new RangeError('in list'), 1, null],
        };

        const decoded = ejson.decode<typeof input>(ejson.encode(input));

        expect(decoded.failed).toBeInstanceOf(Error);
        expect(decoded.failed.name).toBe('MyError');
        expect(decoded.failed.message).toBe('nested');
        expect(decoded.failed.stack).not.toBe(input.failed.stack);
        expect(decoded.list[0]).toBeInstanceOf(Error);
        expect((decoded.list[0] as Error).name).toBe('RangeError');
        expect((decoded.list[0] as Error).message).toBe('in list');
        expect(decoded.list[1]).toBe(1);
        expect(decoded.list[2]).toBe(null);
      });

      it('should restore cause recursively', () => {
        const ejson = createEJSON();
        ejson.addType(EJSON.Type.Error);

        const decoded = ejson.decode<Error>(
          ejson.encode(new Error('outer', { cause: new Error('inner') })),
        );

        expect(decoded.cause).toBeInstanceOf(Error);
        expect((decoded.cause as Error).message).toBe('inner');
      });

      it('should not add cause property when cause is undefined', () => {
        const ejson = createEJSON();
        ejson.addType(EJSON.Type.Error);

        const decoded = ejson.decode<Error>(ejson.encode(new Error('plain')));

        expect(Object.hasOwn(decoded, 'cause')).toBe(false);
      });

      it('should stringify and parse errors', () => {
        const ejson = createEJSON();
        ejson.addType(EJSON.Type.Error);

        const json = ejson.stringify({ err: new Error('boom') });

        expect(json).toBe(
          '{"err":{"$error":{"name":"Error","message":"boom"}}}',
        );

        const parsed = ejson.parse<{ err: Error }>(json);

        expect(parsed.err).toBeInstanceOf(Error);
        expect(parsed.err.message).toBe('boom');
      });
    });

    describe('map / set', () => {
      it('should encode map with object keys', () => {
        const ejson = createEJSON(true);
        const key = { id: 1, at: new Date(0) };

        expect(ejson.encode(new Map([[key, new Set([1n])]]))).toStrictEqual({
          $map: [[{ id: 1, at: { $date: 0 } }, { $set: [{ $bigint: 'AQ' }] }]],
        });
      });

      it('should round trip map with object keys', () => {
        const ejson = createEJSON(true);
        const input = new Map<any, any>([
          [{ id: 1 }, new Set([new Date(0)])],
          ['plain', 2],
        ]);

        const decoded = ejson.decode<Map<any, any>>(ejson.encode(input));

        expect(decoded).toBeInstanceOf(Map);
        expect(decoded).toStrictEqual(input);
        expect([...decoded.values()][0]).toBeInstanceOf(Set);
      });
    });

    describe('placeholder collision', () => {
      it('should unwrap a plain object with exactly one placeholder key', () => {
        const ejson = createEJSON(true);

        expect(ejson.decode({ $date: 0 })).toStrictEqual(new Date(0));
      });

      it('should keep a plain object with placeholder key among other keys', () => {
        const ejson = createEJSON(true);
        const input = { $date: 0, other: 1 };

        expect(ejson.decode(input)).toStrictEqual({ $date: 0, other: 1 });
      });

      it('should keep a plain object with placeholder key among other keys on parse', () => {
        const ejson = createEJSON(true);

        expect(ejson.parse('{"$date":0,"other":1}')).toStrictEqual({
          $date: 0,
          other: 1,
        });
      });
    });

    describe('edge values', () => {
      it('should pass through null, undefined, empty containers', () => {
        const ejson = createEJSON(true);
        const input = {
          n: null,
          u: undefined,
          emptyObj: {},
          emptyArr: [],
          str: '',
          zero: 0,
          f: false,
        };

        expect(ejson.encode(input)).toStrictEqual(input);
        expect(ejson.decode(input)).toStrictEqual(input);
        expect(ejson.encode(null)).toBe(null);
        expect(ejson.encode(undefined)).toBe(undefined);
        expect(ejson.decode(null)).toBe(null);
        expect(ejson.decode(undefined)).toBe(undefined);
      });

      it('should handle deep nesting', () => {
        const ejson = createEJSON(true);
        const input = {
          l1: {
            l2: { l3: { l4: [{ at: new Date(5), set: new Set([/x/g]) }] } },
          },
        };

        const encoded = ejson.encode(input) as any;

        expect(encoded.l1.l2.l3.l4[0].at).toStrictEqual({ $date: 5 });
        expect(encoded.l1.l2.l3.l4[0].set).toStrictEqual({
          $set: [{ $regex: { pattern: 'x', flags: 'g' } }],
        });
        expect(ejson.decode(encoded)).toStrictEqual(input);
      });

      it('should keep null-prototype objects as plain objects', () => {
        const ejson = createEJSON(true);
        const input = Object.create(null);
        input.at = new Date(0);

        expect(ejson.encode(input)).toStrictEqual({ at: { $date: 0 } });
      });

      it('should throw on circular structures', () => {
        const ejson = createEJSON(true);
        const obj: any = { list: [] };
        obj.list.push(obj);

        expect(() => ejson.encode(obj)).toThrow(/circular/i);
        expect(() => ejson.stringify(obj)).toThrow(/circular/i);
      });

      it('should return untouched subtrees as the same reference', () => {
        const ejson = createEJSON(true);
        const plain = { a: 1, list: [1, 2, { b: 'x' }] };
        const input = { plain, at: new Date(0) };

        const encoded = ejson.encode(input) as any;

        expect(encoded).not.toBe(input);
        expect(encoded.plain).toBe(plain);
        expect(ejson.encode(plain)).toBe(plain);
        expect(ejson.decode(plain)).toBe(plain);
      });

      it('should keep "__proto__" as an own key when copying', () => {
        const ejson = createEJSON(true);
        const parsed = ejson.parse<any>(
          '{"__proto__":{"admin":true},"at":{"$date":0}}',
        );

        expect(Object.getPrototypeOf(parsed)).toBe(Object.prototype);
        expect(Object.hasOwn(parsed, '__proto__')).toBe(true);
        expect(parsed.__proto__).toStrictEqual({ admin: true });
        expect(parsed.admin).toBeUndefined();
        expect(parsed.at).toStrictEqual(new Date(0));

        const input = JSON.parse('{"__proto__":{"admin":true},"at":0}');
        input.at = new Date(0);
        const encoded = ejson.encode(input) as any;

        expect(Object.getPrototypeOf(encoded)).toBe(Object.prototype);
        expect(Object.hasOwn(encoded, '__proto__')).toBe(true);
        expect(encoded.admin).toBeUndefined();
      });

      it('should allow the same reference in several places', () => {
        const ejson = createEJSON(true);
        const shared = { at: new Date(0) };
        const encoded = ejson.encode({ a: shared, b: [shared] }) as any;

        expect(encoded.a).toStrictEqual({ at: { $date: 0 } });
        expect(encoded.b[0]).toStrictEqual({ at: { $date: 0 } });
      });
    });

    describe('idempotency', () => {
      const ejson = createEJSON(true);
      ejson.addType(EJSON.Type.Error);

      const input = {
        at: new Date(0),
        map: new Map([['k', new Set([1, 2])]]),
        regex: /a/i,
        inf: Infinity,
        big: 123n,
        bin: new Uint8Array([1, 2]),
        err: new Error('x', { cause: 'why' }),
        list: [1, 'two', null, { nested: -Infinity }],
      };

      it('decode(encode(x)) should be structurally equal to x', () => {
        const decoded = ejson.decode<typeof input>(ejson.encode(input));

        expect(decoded).toStrictEqual(input);
        expect(decoded.err).toBeInstanceOf(Error);
        expect(decoded.err.cause).toBe('why');
      });

      it('encode(encode(x)) should not double wrap', () => {
        const once = ejson.encode(input);

        expect(ejson.encode(once)).toStrictEqual(once);
      });

      it('decode(decode(x)) should be stable', () => {
        const once = ejson.decode(ejson.encode(input));

        expect(ejson.decode(once)).toStrictEqual(once);
      });
    });

    describe('type order', () => {
      it('type added earlier should win on conflict', () => {
        const first = createEJSON();
        first.addType(EJSON.Type.Binary);
        first.addType(bufferType('$buffer'));

        expect(first.encode(new Uint8Array([0]))).toStrictEqual({
          $binary: 'AA==',
        });

        const second = createEJSON();
        second.addType(bufferType('$buffer'));
        second.addType(EJSON.Type.Binary);

        expect(second.encode(new Uint8Array([0]))).toStrictEqual({
          $buffer: [0],
        });
      });
    });

    describe('multi char prefix', () => {
      it('should encode and decode with "__@" prefix', () => {
        const ejson = createMongoLike();
        const outcome = {
          error: new Error('failed'),
          seen: new Set(['a']),
          meta: new Map([['k', 1]]),
          at: new Date(0),
        };

        const encoded = ejson.encode(outcome) as any;

        expect(encoded).toStrictEqual({
          error: { '__@error': { name: 'Error', message: 'failed' } },
          seen: { '__@set': ['a'] },
          meta: { '__@map': [['k', 1]] },
          at: outcome.at,
        });
        expect(encoded.at).toBe(outcome.at);

        const decoded = ejson.decode<typeof outcome>(encoded);

        expect(decoded).toStrictEqual(outcome);
        expect(decoded.error).toBeInstanceOf(Error);
      });

      it('should keep "$" placeholders untouched with "__@" prefix', () => {
        const ejson = createMongoLike();

        expect(
          ejson.decode({ $error: { name: 'Error', message: 'x' } }),
        ).toStrictEqual({
          $error: { name: 'Error', message: 'x' },
        });
      });

      it('should reject prefix change after addType', () => {
        const ejson = createMongoLike();

        expect(() => {
          ejson.placeholderPrefix = '$';
        }).toThrow(
          'placeholderPrefix cannot be changed after types were added.',
        );
      });
    });
  });
});
