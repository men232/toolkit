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

  static get [Symbol.species](): ArrayConstructor {
    return Array;
  }

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
      copyInto(this, items.toSorted(compareFn));
    }
  }

  /**
   * Inserts multiple items while maintaining sort order
   * @param items The items to insert
   * @returns The new length of the array
   */
  push(...items: T[]): number {
    return mergeInto(this, items);
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
    copyInto(result, super.slice(start, end));
    return result;
  }

  /**
   * Filters elements into a new SortedArray with the same comparison function
   * @returns A new SortedArray with the elements that pass the predicate
   */
  filter(
    predicate: (value: T, index: number, array: T[]) => unknown,
    thisArg?: any,
  ): SortedArray<T> {
    var result = new SortedArray<T>(this[SYM_COMPARE_FN]);

    for (var i = 0, k = 0, len = this.length; i < len; i++) {
      if (predicate.call(thisArg, this[i], i, this)) {
        result[k++] = this[i];
      }
    }

    return result;
  }

  /**
   * Removes elements and merges inserted items while maintaining sort order
   * @returns A new SortedArray with the removed elements
   */
  splice(start: number, deleteCount?: number, ...items: T[]): SortedArray<T> {
    var result = new SortedArray<T>(this[SYM_COMPARE_FN]);

    copyInto(
      result,
      arguments.length === 1
        ? super.splice(start)
        : super.splice(start, deleteCount!),
    );

    if (items.length > 0) {
      mergeInto(this, items);
    }

    return result;
  }

  /**
   * Returns a reversed plain array copy, the sorted array is left untouched
   */
  reverse(): T[] {
    var len = this.length;
    var result = new Array<T>(len);

    for (var i = 0; i < len; i++) {
      result[i] = this[len - 1 - i];
    }

    return result;
  }

  /**
   * Returns a sorted plain array copy, the sorted array is left untouched
   */
  // @ts-expect-error
  sort(compareFn?: (a: T, b: T) => number): T[] {
    var len = this.length;
    var result = new Array<T>(len);

    for (var i = 0; i < len; i++) {
      result[i] = this[i];
    }

    return result.sort(compareFn);
  }

  /**
   * Concatenates arrays or values while maintaining sort order
   * @param items Arrays or values to concatenate
   * @returns A new SortedArray with the concatenated elements
   */
  concat(...items: (T | ConcatArray<T>)[]): SortedArray<T> {
    var result = new SortedArray<T>(this[SYM_COMPARE_FN], this);

    for (const item of items) {
      mergeInto(result, Array.isArray(item) ? item : [item as T]);
    }

    return result;
  }
}

function copyInto<T>(target: T[], items: ArrayLike<T>) {
  var len = items.length;
  target.length = len;
  for (var i = 0; i < len; i++) {
    target[i] = items[i];
  }
}

function mergeInto<T>(target: SortedArray<T>, items: ArrayLike<T>): number {
  var compareFn: SortedArrayCompareFn<T> = (target as any)[SYM_COMPARE_FN];
  var newItems = Array.prototype.slice.call(items).sort(compareFn) as T[];
  var i = target.length - 1,
    j = newItems.length - 1,
    k = target.length + newItems.length - 1;

  target.length = k + 1;

  while (j >= 0) {
    if (i >= 0 && compareFn(target[i], newItems[j]) > 0) {
      target[k--] = target[i--];
    } else {
      target[k--] = newItems[j--];
    }
  }

  return target.length;
}
