import { describe, expect, it } from 'vitest';
import { intersectionBy } from './intersectionBy';

describe('intersectionBy', () => {
  describe('with property key', () => {
    it('should return intersection of two arrays by property', () => {
      expect(
        intersectionBy(
          'id',
          [{ id: 1 }, { id: 2 }, { id: 3 }],
          [{ id: 2 }, { id: 3 }, { id: 4 }],
        ),
      ).toEqual([{ id: 2 }, { id: 3 }]);
    });

    it('should handle duplicates by returning unique elements', () => {
      expect(
        intersectionBy(
          'id',
          [{ id: 1 }, { id: 2 }, { id: 1 }],
          [{ id: 1 }, { id: 3 }, { id: 1 }],
        ),
      ).toEqual([{ id: 1 }]);
    });

    it('should return empty array when no common elements', () => {
      expect(
        intersectionBy('id', [{ id: 1 }, { id: 2 }], [{ id: 3 }, { id: 4 }]),
      ).toEqual([]);
    });

    it('should handle undefined/null property values', () => {
      expect(
        intersectionBy(
          'id',
          [{ id: 1 }, { id: undefined }, { id: null }],
          [{ id: undefined }, { id: null }, { id: 2 }],
        ),
      ).toEqual([{ id: undefined }, { id: null }]);
    });
  });

  describe('with iteratee function', () => {
    it('should return intersection using custom function', () => {
      expect(
        intersectionBy(
          v => v.id,
          [{ id: 1 }, { id: 2 }],
          [{ id: 2 }, { id: 3 }],
        ),
      ).toEqual([{ id: 2 }]);
    });

    it('should work with Math.floor for numeric comparison', () => {
      expect(
        intersectionBy(Math.floor, [1.2, 2.3, 3.4], [1.8, 3.6, 4.1]),
      ).toEqual([1.2, 3.4]);
    });

    it('should work with string transformations', () => {
      expect(
        intersectionBy(
          str => str.toLowerCase(),
          ['Apple', 'BANANA', 'Cherry'],
          ['apple', 'cherry', 'DATE'],
        ),
      ).toEqual(['Apple', 'Cherry']);
    });

    it('should work with complex extraction logic', () => {
      const users1 = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
        { name: 'Charlie', age: 25 },
      ];
      const users2 = [
        { name: 'David', age: 25 },
        { name: 'Eve', age: 35 },
      ];

      expect(intersectionBy(u => u.age, users1, users2)).toEqual([
        { name: 'David', age: 25 },
      ]);
    });
  });

  describe('with multiple arrays', () => {
    it('should return intersection of three arrays', () => {
      expect(
        intersectionBy(
          'id',
          [{ id: 1 }, { id: 2 }, { id: 3 }],
          [{ id: 2 }, { id: 3 }, { id: 4 }],
          [{ id: 3 }, { id: 4 }, { id: 5 }],
        ),
      ).toEqual([{ id: 3 }]);
    });

    it('should return intersection of four arrays', () => {
      expect(
        intersectionBy(
          'value',
          [{ value: 'a' }, { value: 'b' }],
          [{ value: 'b' }, { value: 'c' }],
          [{ value: 'b' }, { value: 'd' }],
          [{ value: 'b' }, { value: 'e' }],
        ),
      ).toEqual([{ value: 'b' }]);
    });

    it('should return empty array if any array has no matches', () => {
      expect(
        intersectionBy(
          'id',
          [{ id: 1 }, { id: 2 }],
          [{ id: 2 }, { id: 3 }],
          [{ id: 4 }, { id: 5 }],
        ),
      ).toEqual([]);
    });

    it('should handle when one array is empty', () => {
      expect(
        intersectionBy('id', [], [{ id: 1 }, { id: 2 }], [{ id: 2 }]),
      ).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should return empty array when no arrays provided', () => {
      expect(intersectionBy('id')).toEqual([]);
    });

    it('should return the array itself when only one array provided', () => {
      const arr = [{ id: 1 }, { id: 2 }];
      expect(intersectionBy('id', arr)).toStrictEqual(arr);
    });

    it('should handle arrays with different sized objects', () => {
      expect(
        intersectionBy('id', [{ id: 1, extra: 'data' }], [{ id: 1 }]),
      ).toEqual([{ id: 1, extra: 'data' }]);
    });

    it('should work with primitive wrapper objects', () => {
      expect(
        intersectionBy(
          'value',
          [{ value: 0 }, { value: false }, { value: '' }],
          [{ value: 0 }, { value: false }],
        ),
      ).toEqual([{ value: 0 }, { value: false }]);
    });

    it('should handle large arrays efficiently', () => {
      const large1 = Array.from({ length: 1000 }, (_, i) => ({ id: i }));
      const large2 = Array.from({ length: 1000 }, (_, i) => ({ id: i + 500 }));

      const result = intersectionBy('id', large1, large2);

      expect(result.length).toBe(500);
      expect(result[0]).toEqual({ id: 500 });
      expect(result[499]).toEqual({ id: 999 });
    });

    it('should work with Symbol keys', () => {
      const sym1 = Symbol('test');
      const sym2 = Symbol('test');

      expect(
        intersectionBy('key', [{ key: sym1 }, { key: sym2 }], [{ key: sym1 }]),
      ).toEqual([{ key: sym1 }]);
    });
  });

  describe('type coercion and equality', () => {
    it('should treat different types as different keys', () => {
      expect(
        intersectionBy(
          'value',
          [{ value: 1 }, { value: '1' }],
          [{ value: '1' }],
        ),
      ).toEqual([{ value: '1' }]);
    });

    it('should handle NaN correctly', () => {
      expect(
        intersectionBy(
          'value',
          [{ value: NaN }, { value: 1 }],
          [{ value: NaN }, { value: 2 }],
        ),
      ).toEqual([{ value: NaN }]);
    });

    it('should return the intersection of two arrays with `mapper`', () => {
      expect(intersectionBy(Math.floor, [1.2, 2.1], [1.4, 3.1])).toStrictEqual([
        1.2,
      ]);
      expect(
        intersectionBy(
          x => x.foo,
          [{ foo: 1 }, { foo: 2 }],
          [{ foo: 1 }, { foo: 3 }],
        ),
      ).toStrictEqual([{ foo: 1 }]);
    });

    it('should return the intersection of two arrays with different element types using a `mapper` function', () => {
      type CSV = { id: number; csv: number };
      type JSON = { id: number; json: number };

      const array1: CSV[] = [
        { id: 1, csv: 1 },
        { id: 2, csv: 1 },
        { id: 3, csv: 1 },
      ];
      const array2: JSON[] = [
        { id: 2, json: 2 },
        { id: 4, json: 2 },
      ];

      const result = intersectionBy<CSV | JSON>(
        value => value.id,
        array1,
        array2,
      );
      expect(result).toEqual([{ id: 2, json: 2 }]);
    });
  });
});
