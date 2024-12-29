import { describe, expect, it } from 'vitest';
import { EJSON, createEJSON } from './index';

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
});
