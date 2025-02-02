import { describe, expect, it } from 'vitest';
import { qs } from './qs';

describe('qs', () => {
  const allTypeObject = {
    undefined: undefined,
    null: null,
    array: [1, 2, 3],
    array_obj: [{ id: 1 }, { id: 2 }],
    array_arr: [
      [1, 2],
      [3, 4],
    ],
    date: new Date(0),
    map: new Map([
      ['key_1', 1],
      ['key_2', 2],
    ]),
    set: new Set([1, 2, 3]),
    bool_true: true,
    bool_false: false,
    str: 'hi',
    object: { id: 1, name: 'andrew' },
  };

  const allTypeString =
    'array=1%2C2%2C3&array_obj=%5B%7B%22id%22%3A1%7D%2C%7B%22id%22%3A2%7D%5D&array_arr=%5B%5B1%2C2%5D%2C%5B3%2C4%5D%5D&date=1970-01-01T00%3A00%3A00.000Z&map=%5B%5B%22key_1%22%2C1%5D%2C%5B%22key_2%22%2C2%5D%5D&set=%5B1%2C2%2C3%5D&bool_true=true&bool_false=false&str=hi&object=%7B%22id%22%3A1%2C%22name%22%3A%22andrew%22%7D';

  const allTypeStringWithEmpty =
    'undefined=&null=&array=1%2C2%2C3&array_obj=%5B%7B%22id%22%3A1%7D%2C%7B%22id%22%3A2%7D%5D&array_arr=%5B%5B1%2C2%5D%2C%5B3%2C4%5D%5D&date=1970-01-01T00%3A00%3A00.000Z&map=%5B%5B%22key_1%22%2C1%5D%2C%5B%22key_2%22%2C2%5D%5D&set=%5B1%2C2%2C3%5D&bool_true=true&bool_false=false&str=hi&object=%7B%22id%22%3A1%2C%22name%22%3A%22andrew%22%7D';

  it('stringify', () => {
    expect(qs.stringify(allTypeObject)).toBe(allTypeString);
  });

  it('stringify (with empty)', () => {
    expect(qs.stringify(allTypeObject, { excludeEmpty: false })).toBe(
      allTypeStringWithEmpty,
    );
  });

  it('parse', () => {
    expect(qs.parse(allTypeString, allTypeObject)).toStrictEqual({
      undefined: undefined,
      null: null,
      array: [1, 2, 3],
      array_obj: [{ id: 1 }, { id: 2 }],
      array_arr: [
        [1, 2],
        [3, 4],
      ],
      date: new Date(0),
      map: new Map([
        ['key_1', 1],
        ['key_2', 2],
      ] as [string, number][]),
      set: new Set([1, 2, 3]),
      bool_true: true,
      bool_false: false,
      str: 'hi',
      object: { id: 1, name: 'andrew' },
    });
  });

  it('parse (with empty)', () => {
    expect(qs.parse(allTypeStringWithEmpty, allTypeObject)).toStrictEqual({
      undefined: undefined,
      null: null,
      array: [1, 2, 3],
      array_obj: [{ id: 1 }, { id: 2 }],
      array_arr: [
        [1, 2],
        [3, 4],
      ],
      date: new Date(0),
      map: new Map([
        ['key_1', 1],
        ['key_2', 2],
      ] as [string, number][]),
      set: new Set([1, 2, 3]),
      bool_true: true,
      bool_false: false,
      str: 'hi',
      object: { id: 1, name: 'andrew' },
    });
  });

  describe('stringifyValue', () => {
    it('undefined', () => expect(qs.stringifyValue(undefined)).toBe(''));
    it('null', () => expect(qs.stringifyValue(null)).toBe(''));
    it('array (plain)', () => expect(qs.stringifyValue([1, 2])).toBe('1,2'));
    it('array (str with comma)', () =>
      expect(qs.stringifyValue(['a,b', 'c'])).toBe('["a,b","c"]'));
    it('array (obj)', () =>
      expect(qs.stringifyValue([{}, {}])).toBe('[{},{}]'));
    it('array (arrays)', () =>
      expect(qs.stringifyValue([[], []])).toBe('[[],[]]'));
    it('date', () =>
      expect(qs.stringifyValue(new Date(0))).toBe('1970-01-01T00:00:00.000Z'));
    it('map', () =>
      expect(qs.stringifyValue(new Map([[1, 1]]))).toBe('[[1,1]]'));
    it('set', () => expect(qs.stringifyValue(new Set([1, 2]))).toBe('[1,2]'));
    it('boolean (true)', () => expect(qs.stringifyValue(true)).toBe('true'));
    it('boolean (false)', () => expect(qs.stringifyValue(false)).toBe('false'));
    it('number', () => expect(qs.stringifyValue(123)).toBe('123'));
    it('string', () => expect(qs.stringifyValue('abc')).toBe('abc'));
    it('bigint', () => expect(qs.stringifyValue(123n)).toBe('123'));
    it('object', () => expect(qs.stringifyValue({ a: 1 })).toBe('{"a":1}'));
  });

  describe('merge', () => {
    const dataset: Record<string, [any[], any]> = {
      objects: [[{ a: 1 }, { c: 1 }], { a: 1, c: 1 }],
      array: [
        [
          [1, 2, 3],
          [2, 3, 4],
        ],
        [1, 2, 3, 4],
      ],
      map: [
        [
          new Map([
            ['key_1', 1],
            ['key_2', 2],
          ]),
          new Map([
            ['key_1', 2],
            ['key_3', 3],
          ]),
        ],
        new Map([
          ['key_1', 2],
          ['key_2', 2],
          ['key_3', 3],
        ]),
      ],
      set: [
        [new Set([1, 2]), new Set([1, 2, 3, 4, 5])],
        new Set([1, 2, 3, 4, 5]),
      ],
      string: [['abc', 'cde'], 'cde'],
      boolean: [[false, true], true],
      number: [[1, 2], 2],
      overwrite: [[1, 'abc'], 'abc'],
    };

    for (const [testName, [input, output]] of Object.entries(dataset)) {
      it(testName, () =>
        expect(
          qs.merge(
            ...input.map(v => ({
              value: v,
            })),
          ),
        ).toStrictEqual({ value: output }),
      );
    }
  });
});
