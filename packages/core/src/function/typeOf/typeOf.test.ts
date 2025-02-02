import { describe, expect, it } from 'vitest';
import { typeOf } from './typeOf';

describe('typeOf', () => {
  const cases = {
    null: [null],
    undefined: [undefined],
    object: [{}],
    string: [''],
    number: [1],
    bigint: [1n],
    function: [() => {}],
    boolean: [true, false],
    symbol: [Symbol()],
    date: [new Date()],
    array: [[]],
    map: [new Map()],
    weakmap: [new WeakMap()],
    set: [new Set()],
    weakset: [new WeakSet()],
    unknown: [new Date(NaN), NaN, new Uint16Array()],
  };

  for (const [type, values] of Object.entries(cases)) {
    it(type, () => {
      for (const value of values) {
        expect(typeOf(value)).toBe(type);
      }
    });
  }
});
