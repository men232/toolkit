import { isNumber } from '@/is';

/**
 * Simple implementation of LRU cache
 *
 * @group Cache
 */
export class LruCache<TKey = any, TValue = any> {
  private items: Map<TKey, number>;
  private forward: Uint8Array | Uint16Array | Uint32Array;
  private backward: Uint8Array | Uint16Array | Uint32Array;
  private K: TKey[];
  private V: (TValue | undefined)[];

  size: number;
  private head: number;
  private tail: number;

  constructor(private capacity: number) {
    this.capacity = Math.max(isNumber(capacity) ? capacity : 0, 0);

    this.forward = pointerArray(this.capacity);
    this.backward = pointerArray(this.capacity);
    this.K = new Array(capacity);
    this.V = new Array(capacity);

    this.items = new Map();

    this.size = 0;
    this.head = 0;
    this.tail = 0;
  }

  /**
   * Method used to clear the structure.
   */
  clear() {
    this.size = 0;
    this.head = 0;
    this.tail = 0;
    this.items.clear();
  }

  set(key: TKey, value: TValue): this {
    let pointer = this.items.get(key);

    // The key already exists, we just need to update the value and splay on top
    if (pointer !== undefined) {
      this.splayOnTop(pointer);
      this.V[pointer] = value;
      return this;
    }

    // The cache is not yet full
    if (this.size < this.capacity) {
      pointer = this.size++;
    }

    // Cache is full, we need to drop the last value
    else {
      pointer = this.tail;
      this.tail = this.backward[pointer];
      this.items.delete(this.K[pointer]);
    }

    // Storing key & value
    this.items.set(key, pointer);
    this.K[pointer] = key;
    this.V[pointer] = value;

    // Moving the item at the front of the list
    this.forward[pointer] = this.head;
    this.backward[this.head] = pointer;
    this.head = pointer;

    return this;
  }

  has(key: TKey): boolean {
    return this.peek(key) !== undefined;
  }

  delete(key: TKey): void {
    const pointer = this.items.get(key);

    if (pointer === undefined) return;

    this.V[pointer] = undefined;
  }

  get(key: TKey): TValue | undefined {
    const pointer = this.items.get(key);

    if (pointer === undefined) return;

    this.splayOnTop(pointer);

    return this.V[pointer];
  }

  /**
   * Method used to get the value attached to the given key. Does not modify
   * the ordering of the underlying linked list.
   */
  peek(key: TKey): TValue | undefined {
    const pointer = this.items.get(key);

    if (pointer === undefined) return;

    return this.V[pointer];
  }

  /**
   * Method used to create an iterator over the cache's keys from most
   * recently used to least recently used.
   */
  keys(): IterableIterator<TKey> {
    let i = 0,
      l = this.size;

    let pointer = this.head,
      keys = this.K,
      forward = this.forward;

    const iterator: Iterator<TKey> = {
      next: () => {
        if (i >= l) return { done: true, value: undefined };

        const key = keys[pointer];

        i++;

        if (i < l) pointer = forward[pointer];

        // skip marked as removed
        if (this.peek(key) === undefined) return iterator.next();

        return {
          done: false,
          value: key,
        };
      },
    };

    return {
      ...iterator,
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  /**
   * Method used to create an iterator over the cache's values from most
   * recently used to least recently used.
   *
   */
  values(): IterableIterator<TValue> {
    let i = 0,
      l = this.size;

    let pointer = this.head,
      values = this.V,
      forward = this.forward;

    const iterator: Iterator<TValue> = {
      next: () => {
        if (i >= l) return { done: true, value: undefined };

        const value = values[pointer];

        i++;

        if (i < l) pointer = forward[pointer];

        // skip marked as removed
        if (value === undefined) return iterator.next();

        return {
          done: false,
          value: value,
        };
      },
    };

    return {
      ...iterator,
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  /**
   * Method used to create an iterator over the cache's entries from most
   * recently used to least recently used.
   *
   * @return {IterableIterator<[TKey, TValue | undefined]>}
   */
  entries() {
    let i = 0,
      l = this.size;

    let pointer = this.head,
      keys = this.K,
      values = this.V,
      forward = this.forward;

    /** @type {Iterator<[TKey, TValue | undefined]>} */
    const iterator = {
      next() {
        if (i >= l) return { done: true, value: undefined };

        const key = keys[pointer],
          value = values[pointer];

        i++;

        if (i < l) pointer = forward[pointer];

        return {
          done: false,
          value: [key, value],
        };
      },
    };

    return {
      ...iterator,
      [Symbol.iterator]() {
        return this;
      },
    };
  }

  /**
   * Method used to splay a value on top.
   *
   * @param  {number}   pointer - Pointer of the value to splay on top.
   */
  splayOnTop(pointer: number): this {
    const oldHead = this.head;

    if (this.head === pointer) return this;

    const previous = this.backward[pointer],
      next = this.forward[pointer];

    if (this.tail === pointer) {
      this.tail = previous;
    } else {
      this.backward[next] = previous;
    }

    this.forward[previous] = next;

    this.backward[oldHead] = pointer;
    this.head = pointer;
    this.forward[pointer] = oldHead;

    return this;
  }

  [Symbol.iterator]() {
    return this.entries();
  }
}

const MAX_8BIT_INTEGER = Math.pow(2, 8) - 1,
  MAX_16BIT_INTEGER = Math.pow(2, 16) - 1,
  MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;

function pointerArray(size: number): Uint8Array | Uint16Array | Uint32Array {
  const maxIndex = size - 1;

  if (maxIndex <= MAX_8BIT_INTEGER) return new Uint8Array(size);

  if (maxIndex <= MAX_16BIT_INTEGER) return new Uint16Array(size);

  if (maxIndex <= MAX_32BIT_INTEGER) return new Uint32Array(size);

  throw new Error('Pointer Array of size > 4294967295 is not supported.');
}
