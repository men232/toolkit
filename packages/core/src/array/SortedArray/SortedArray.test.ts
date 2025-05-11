import { beforeEach, describe, expect, it } from 'vitest';
import { SortedArray } from './SortedArray.js';

describe('SortedArray', () => {
  // Define comparison functions
  const ascendingNumberCompare = (a: number, b: number) => a - b;
  const descendingNumberCompare = (a: number, b: number) => b - a;
  const stringCompare = (a: string, b: string) => a.localeCompare(b);

  // Define test arrays
  let emptyArray: SortedArray<number>;
  let numberArray: SortedArray<number>;
  let descendingArray: SortedArray<number>;
  let stringArray: SortedArray<string>;

  beforeEach(() => {
    emptyArray = new SortedArray<number>(ascendingNumberCompare);
    numberArray = new SortedArray<number>(
      ascendingNumberCompare,
      [5, 3, 8, 1, 4],
    );
    descendingArray = new SortedArray<number>(
      descendingNumberCompare,
      [5, 3, 8, 1, 4],
    );
    stringArray = new SortedArray<string>(stringCompare, [
      'banana',
      'apple',
      'cherry',
    ]);
  });

  describe('constructor', () => {
    it('creates an empty array with no items', () => {
      expect(emptyArray.length).toBe(0);
    });

    it('sorts items provided to constructor in ascending order', () => {
      expect([...numberArray]).toEqual([1, 3, 4, 5, 8]);
    });

    it('sorts items provided to constructor using custom compare function', () => {
      expect([...descendingArray]).toEqual([8, 5, 4, 3, 1]);
    });

    it('works with string values', () => {
      expect([...stringArray]).toEqual(['apple', 'banana', 'cherry']);
    });
  });

  describe('push', () => {
    it('maintains sort order when pushing a single item', () => {
      numberArray.push(6);
      expect([...numberArray]).toEqual([1, 3, 4, 5, 6, 8]);
    });

    it('maintains sort order when pushing multiple items', () => {
      numberArray.push(0, 6, 2, 7);
      expect([...numberArray]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('handles pushing items to an empty array', () => {
      emptyArray.push(3, 1, 4);
      expect([...emptyArray]).toEqual([1, 3, 4]);
    });

    it('returns the new length', () => {
      const newLength = numberArray.push(6, 2);
      expect(newLength).toBe(7); // Original 5 + 2 new items
    });

    it('works with custom compare function', () => {
      descendingArray.push(2, 9, 6);
      expect([...descendingArray]).toEqual([9, 8, 6, 5, 4, 3, 2, 1]);
    });

    it('handles pushing duplicate values', () => {
      numberArray.push(3, 4, 3);
      expect([...numberArray]).toEqual([1, 3, 3, 3, 4, 4, 5, 8]);
    });
  });

  describe('unshift', () => {
    it('delegates to push and maintains sort order', () => {
      numberArray.unshift(0, 6, 2);
      expect([...numberArray]).toEqual([0, 1, 2, 3, 4, 5, 6, 8]);
    });

    it('returns the new length', () => {
      const newLength = numberArray.unshift(6, 2);
      expect(newLength).toBe(7); // Original 5 + 2 new items
    });
  });

  describe('slice', () => {
    it('returns a new SortedArray with the same compare function', () => {
      const sliced = numberArray.slice(1, 4);
      expect(sliced).toBeInstanceOf(SortedArray);
      expect([...sliced]).toEqual([3, 4, 5]);

      // Verify it preserves the sorting behavior
      sliced.push(2);
      expect([...sliced]).toEqual([2, 3, 4, 5]);
    });

    it('works with no parameters', () => {
      const sliced = numberArray.slice();
      expect([...sliced]).toEqual([1, 3, 4, 5, 8]);
    });

    it('works with negative indices', () => {
      const sliced = numberArray.slice(-3, -1);
      expect([...sliced]).toEqual([4, 5]);
    });
  });

  describe('concat', () => {
    it('concatenates and sorts arrays', () => {
      const other = [9, 2, 7];
      const result = numberArray.concat(other);

      expect(result).toBeInstanceOf(SortedArray);
      expect([...result]).toEqual([1, 2, 3, 4, 5, 7, 8, 9]);
    });

    it('concatenates multiple arrays and values', () => {
      const result = numberArray.concat([9, 2], 0, [7, 6]);
      expect([...result]).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    });

    it('works with empty source array', () => {
      const result = emptyArray.concat([3, 1, 4]);
      expect([...result]).toEqual([1, 3, 4]);
    });

    it('works with empty parameters', () => {
      const result = numberArray.concat();
      expect([...result]).toEqual([1, 3, 4, 5, 8]);
    });

    it('works with custom compare function', () => {
      const result = descendingArray.concat([2, 9, 6]);
      expect([...result]).toEqual([9, 8, 6, 5, 4, 3, 2, 1]);
    });
  });

  describe('integration', () => {
    it('handles a sequence of operations correctly', () => {
      const arr = new SortedArray<number>(ascendingNumberCompare);

      arr.push(5, 3, 8);
      expect([...arr]).toEqual([3, 5, 8]);

      arr.unshift(1, 4);
      expect([...arr]).toEqual([1, 3, 4, 5, 8]);

      const sliced = arr.slice(1, 4);
      expect([...sliced]).toEqual([3, 4, 5]);

      const result = sliced.concat([2, 6]);
      expect([...result]).toEqual([2, 3, 4, 5, 6]);

      // Original arrays should be unchanged
      expect([...arr]).toEqual([1, 3, 4, 5, 8]);
      expect([...sliced]).toEqual([3, 4, 5]);
    });

    it('works with complex objects using custom comparator', () => {
      type Person = { id: number; name: string };
      const personCompare = (a: Person, b: Person) => a.id - b.id;

      const people = new SortedArray<Person>(personCompare, [
        { id: 3, name: 'Charlie' },
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      expect(people.map(p => p.id)).toStrictEqual([1, 2, 3]);

      people.push({ id: 0, name: 'Zero' }, { id: 4, name: 'Dave' });
      expect(people.map(p => p.name)).toEqual([
        'Zero',
        'Alice',
        'Bob',
        'Charlie',
        'Dave',
      ]);
    });
  });

  describe('edge cases', () => {
    it('handles arrays with a single element', () => {
      const singleItem = new SortedArray<number>(ascendingNumberCompare, [42]);
      expect([...singleItem]).toEqual([42]);

      singleItem.push(10);
      expect([...singleItem]).toEqual([10, 42]);
    });

    it('handles pushing a large number of items', () => {
      const largeArray = new SortedArray<number>(ascendingNumberCompare);
      const items = Array.from({ length: 1000 }, (_, i) => 1000 - i);

      largeArray.push(...items);
      expect(largeArray.length).toBe(1000);
      expect(largeArray[0]).toBe(1);
      expect(largeArray[999]).toBe(1000);

      // Check if a few random positions are in order
      expect(largeArray[100]).toBe(101);
      expect(largeArray[500]).toBe(501);
      expect(largeArray[900]).toBe(901);
    });

    it('preserves sorting with NaN values using a special comparator', () => {
      // Special comparator that handles NaN values
      const nanSafeCompare = (a: number, b: number) => {
        if (isNaN(a) && isNaN(b)) return 0;
        if (isNaN(a)) return 1; // NaN goes at the end
        if (isNaN(b)) return -1;
        return a - b;
      };

      const nanArray = new SortedArray<number>(nanSafeCompare, [
        NaN,
        3,
        1,
        NaN,
        2,
      ]);
      expect(nanArray[0]).toBe(1);
      expect(nanArray[1]).toBe(2);
      expect(nanArray[2]).toBe(3);
      expect(isNaN(nanArray[3])).toBe(true);
      expect(isNaN(nanArray[4])).toBe(true);
    });
  });
});
