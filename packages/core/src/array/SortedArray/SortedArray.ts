import { def } from '@/object';

/**
 * Function that compares two elements and returns a number indicating their relative order.
 * - Negative number if a < b
 * - Zero if a equals b
 * - Positive number if a > b
 *
 * @template T The type of elements in the array
 */
export type SortedArrayCompareFn<T> = (a: T, b: T) => number;

const SYM_COMPARE_FN = Symbol('SYM_COMPARE_FN');

/**
 * A self-sorting array that maintains elements in a sorted order based on a comparison function.
 * All mutating operations preserve the sorted order of elements.
 *
 * @template T The type of elements in the array
 *
 * @example
 * // Create a numerically sorted array
 * const arr = new SortedArray((a, b) => a - b);
 * arr.push(3, 2, 1);
 * console.log(arr); // [1, 2, 3]
 *
 * @example
 * // Create a sorted array with initial values
 * const names = new SortedArray((a, b) => a.localeCompare(b), ["Charlie", "Alice", "Bob"]);
 * console.log(names); // ["Alice", "Bob", "Charlie"]
 *
 * @example
 * // Create a sorted array with a custom comparator
 * const people = new SortedArray(
 *   (a, b) => a.age - b.age || a.name.localeCompare(b.name),
 *   [{ name: "Alice", age: 30 }, { name: "Bob", age: 25 }]
 * );
 *
 * @group Array
 */
export class SortedArray<T> extends Array<T> {
  // @ts-expect-error
  private [SYM_COMPARE_FN]: SortedArrayCompareFn<T>;

  /**
   * Creates a new SortedArray instance.
   *
   * @param compareFn The comparison function to determine the sort order
   * @param items Optional initial items to add to the array (will be sorted immediately)
   */
  constructor(compareFn: SortedArrayCompareFn<T>, items: T[] = []) {
    super();

    def(this, SYM_COMPARE_FN, compareFn);

    // Add initial items in sorted order if provided
    if (items.length > 0) {
      super.push.apply(this, items.toSorted(compareFn));
    }
  }

  /**
   * Inserts multiple items while maintaining sort order
   * @param items The items to insert
   * @returns The new length of the array
   */
  push(...items: T[]): number {
    // For large batches, first sort the new items
    var newItems = items.toSorted(this[SYM_COMPARE_FN]);
    var newItemsLen = newItems.length;
    var originalLen = this.length;

    // Calculate final array size and prepare space
    var result = new Array<T>(originalLen + newItemsLen);

    // Merge the two sorted arrays with minimal comparisons
    var i = 0,
      j = 0,
      k = 0;

    // Main merge loop - stops when either array is exhausted
    while (i < originalLen && j < newItemsLen) {
      if (this[SYM_COMPARE_FN](this[i], newItems[j]) <= 0) {
        result[k++] = this[i++];
      } else {
        result[k++] = newItems[j++];
      }
    }

    // Copy remaining elements (only one of these loops will execute)
    while (i < originalLen) {
      result[k++] = this[i++];
    }

    while (j < newItemsLen) {
      result[k++] = newItems[j++];
    }

    // Fastest way to replace content: clear and use super.push with spread
    this.length = 0;
    super.push.apply(this, result);

    return this.length;
  }

  /**
   * Override Array methods that would break the sorted order
   */
  unshift(...items: T[]): number {
    return this.push(...items);
  }

  /**
   * Creates a new SortedArray with the same comparison function
   * @returns A new SortedArray instance
   */
  slice(start?: number, end?: number): SortedArray<T> {
    var result = new SortedArray<T>(this[SYM_COMPARE_FN]);
    var sliced = super.slice(start, end);
    super.push.apply(result, sliced);
    return result;
  }

  /**
   * Concatenates arrays or values while maintaining sort order
   * @param items Arrays or values to concatenate
   * @returns A new SortedArray with the concatenated elements
   */
  concat(...items: (T | ConcatArray<T>)[]): SortedArray<T> {
    var result = new SortedArray<T>(this[SYM_COMPARE_FN], this);

    for (const item of items) {
      if (Array.isArray(item)) {
        result.push.apply(result, item);
      } else {
        result.push(item as T);
      }
    }

    return result;
  }
}

// Wrap original array methods to return regular array instead of sorted array
['map', 'filter', 'flatMap', 'flat', 'reverse', 'sort'].forEach((key: any) => {
  SortedArray.prototype[key] = function () {
    const arr = Array.prototype[key].apply(this, arguments);
    Object.setPrototypeOf(arr, Array.prototype);
    return arr;
  };
});
