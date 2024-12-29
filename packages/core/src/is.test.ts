import { describe, expect, it } from 'vitest';
import { isEqual } from './is';

describe('isEqual', () => {
  it('should handle primitive types', () => {
    expect(isEqual(42, 42)).toBe(true);
    expect(isEqual('hello', 'hello')).toBe(true);
    expect(isEqual(true, true)).toBe(true);
    expect(isEqual(null, null)).toBe(true);
    expect(isEqual(undefined, undefined)).toBe(true);
    expect(isEqual(42, '42')).toBe(false);
    expect(isEqual(true, false)).toBe(false);
  });

  it('should handle objects', () => {
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
    expect(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    expect(isEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
  });

  it('should handle arrays', () => {
    expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true);
    expect(isEqual([1, 2, 3], [3, 2, 1])).toBe(false);
    expect(isEqual([1, 2], [1, 2, 3])).toBe(false);
  });

  it('should handle nested structures', () => {
    expect(
      isEqual(
        { a: { b: [1, 2, 3], c: { d: 'hello' } } },
        { a: { b: [1, 2, 3], c: { d: 'hello' } } },
      ),
    ).toBe(true);
    expect(
      isEqual(
        { a: { b: [1, 2, 3], c: { d: 'hello' } } },
        { a: { b: [1, 2, 3], c: { d: 'world' } } },
      ),
    ).toBe(false);
  });

  it('should handle Map', () => {
    const map1 = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const map2 = new Map([
      ['a', 1],
      ['b', 2],
    ]);
    const map3 = new Map([
      ['a', 1],
      ['b', 3],
    ]);
    expect(isEqual(map1, map2)).toBe(true);
    expect(isEqual(map1, map3)).toBe(false);
  });

  it('should handle Set', () => {
    const set1 = new Set([1, 2, 3]);
    const set2 = new Set([1, 2, 3]);
    const set3 = new Set([3, 2, 1]);
    const set4 = new Set([1, 2]);
    expect(isEqual(set1, set2)).toBe(true);
    expect(isEqual(set1, set3)).toBe(true); // Sets are unordered
    expect(isEqual(set1, set4)).toBe(false);
  });

  it('should handle Date', () => {
    const date1 = new Date('2024-01-01');
    const date2 = new Date('2024-01-01');
    const date3 = new Date('2025-01-01');
    expect(isEqual(date1, date2)).toBe(true);
    expect(isEqual(date1, date3)).toBe(false);
  });

  it('should handle RegExp', () => {
    const regex1 = /abc/;
    const regex2 = /abc/;
    const regex3 = /abc/i;
    expect(isEqual(regex1, regex2)).toBe(true);
    expect(isEqual(regex1, regex3)).toBe(false);
  });

  it('should handle functions', () => {
    const func1 = () => 42;
    const func2 = () => 42;
    const func3 = () => 43;
    expect(isEqual(func1, func1)).toBe(true); // Same reference
    expect(isEqual(func1, func2)).toBe(false); // Different references
    expect(isEqual(func1, func3)).toBe(false);
  });

  it('should handle symbols', () => {
    const sym1 = Symbol('a');
    const sym2 = Symbol('a');
    expect(isEqual(sym1, sym1)).toBe(true);
    expect(isEqual(sym1, sym2)).toBe(false);
  });

  it('should handle ArrayBuffer', () => {
    const buffer1 = new ArrayBuffer(8);
    const buffer2 = new ArrayBuffer(8);
    const buffer3 = new ArrayBuffer(16);

    new Uint8Array(buffer1).set([1, 2, 3]);
    new Uint8Array(buffer2).set([1, 2, 3]);

    expect(isEqual(buffer1, buffer2)).toBe(true);
    expect(isEqual(buffer1, buffer3)).toBe(false);
  });

  it('should handle DataView', () => {
    const buffer1 = new ArrayBuffer(8);
    const buffer2 = new ArrayBuffer(8);
    const buffer3 = new ArrayBuffer(16);

    const view1 = new DataView(buffer1);
    const view2 = new DataView(buffer2);
    const view3 = new DataView(buffer3);

    view1.setInt8(0, 42);
    view2.setInt8(0, 42);

    expect(isEqual(view1, view2)).toBe(true);
    expect(isEqual(view1, view3)).toBe(false);

    view2.setInt8(0, 43);
    expect(isEqual(view1, view2)).toBe(false);
  });

  it('should handle different types', () => {
    expect(isEqual({ a: 1 }, [1])).toBe(false);
    expect(isEqual(new Set([1, 2]), new Map([[1, 2]]))).toBe(false);
    expect(isEqual(42, null)).toBe(false);
  });
});
