import { describe, expect, it } from 'vitest';
import { toString } from './toString';

const symbol = Symbol('a');

function stubString(): string {
  return '';
}

describe('toString', () => {
  it('should treat nullish values as empty strings', () => {
    const values = [, null, undefined];
    const expected = values.map(stubString);

    const actual = values.map((value, index) =>
      index ? toString(value) : toString(),
    );

    expect(actual).toEqual(expected);
  });

  it('should preserve the sign of `0`', () => {
    const values = [-0, Object(-0), 0, Object(0)];
    const expected = ['-0', '-0', '0', '0'];
    const actual = values.map(toString);

    expect(actual).toEqual(expected);
  });

  it('should preserve the sign of `0` in an array', () => {
    const values = [-0, Object(-0), 0, Object(0)];
    expect(toString(values)).toEqual('-0,-0,0,0');
  });

  it('should handle symbols', () => {
    expect(toString(symbol)).toBe('Symbol(a)');
  });

  it('should handle an array of symbols', () => {
    expect(toString([symbol])).toBe('Symbol(a)');
  });
});
