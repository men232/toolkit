import { assertCapacity } from './utils';

/**
 * A Map-like class with a fixed capacity, where entries are automatically removed
 * when the capacity is exceeded. This allows for efficient caching behavior,
 * ensuring that the map never grows beyond the specified capacity.
 *
 * When the map reaches its capacity, the oldest entries (in insertion order)
 * are removed to make room for new ones.
 *
 * @example
 * const cache = new FixedMap<string, number>(3);
 * cache.set('a', 1);
 * cache.set('b', 2);
 * cache.set('c', 3);
 * cache.set('d', 4); // 'a' will be evicted, as it's the oldest entry
 *
 * console.log(cache.get('a')); // undefined
 * console.log(cache.get('b')); // 2
 *
 * @group Cache
 */
export class FixedMap<K = any, V = any> extends Map<K, V> {
  private _tail: K[];

  constructor(private _capacity: number) {
    assertCapacity(_capacity);
    super();
    this._tail = [];
  }

  set(key: K, value: V): this {
    if (!super.has.call(this, key)) {
      this._tail.push(key);
    }

    super.set.call(this, key, value);
    this._drain();

    return this;
  }

  delete(key: K): boolean {
    const removed = super.delete.call(this, key);

    if (removed) {
      const idx = this._tail.findIndex(v => v === key);

      if (idx > -1) {
        this._tail.splice(idx, 1);
      }
    }

    return removed;
  }

  clear(): void {
    // @ts-expect-error
    delete this._tail;
    this._tail = [];

    super.clear.call(this);
  }

  get capacity(): number {
    return this._capacity;
  }

  set capacity(value: number) {
    assertCapacity(value);
    this._capacity = value;
    this._drain();
  }

  private _drain() {
    while (this._tail.length > this._capacity) {
      const key = this._tail.shift();

      key !== undefined && this.delete(key);
    }
  }
}
