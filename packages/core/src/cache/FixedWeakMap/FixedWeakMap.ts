import { assertCapacity } from '../FixedMap/utils';

/**
 * A `WeakMap`-like class with a fixed capacity. Entries are automatically removed
 * when the map exceeds the specified capacity. Unlike a regular `WeakMap`, the
 * entries are limited to a defined size, and the oldest entries are evicted when
 * new ones are added after the capacity is reached.
 *
 * This class behaves similarly to a `WeakMap`, but with the additional constraint
 * of a fixed size. It automatically removes the least recently added key-value
 * pairs when the map grows beyond the specified capacity.
 *
 * @example
 * const cache = new FixedWeakMap<object, number>(3);
 * const obj1 = { id: 1 };
 * const obj2 = { id: 2 };
 * const obj3 = { id: 3 };
 *
 * cache.set(obj1, 1);
 * cache.set(obj2, 2);
 * cache.set(obj3, 3);
 *
 * const obj4 = { id: 4 };
 * cache.set(obj4, 4); // obj1 will be evicted as it's the oldest
 *
 * console.log(cache.get(obj1)); // undefined
 * console.log(cache.get(obj2)); // 2
 * console.log(cache.get(obj4)); // 4
 *
 * @group Cache
 */
export class FixedWeakMap<K extends WeakKey = WeakKey, V = any> extends WeakMap<
  K,
  V
> {
  private _tail: K[];

  constructor(private _capacity: number) {
    assertCapacity(_capacity);
    super();
    this._tail = [];
  }

  set(key: K, value: V): this {
    if (!super.has(key)) {
      this._tail.push(key);
    }

    super.set(key, value);
    this._drain();

    return this;
  }

  delete(key: K): boolean {
    const removed = super.delete(key);

    if (removed) {
      const idx = this._tail.findIndex(v => v === key);

      if (idx > -1) {
        this._tail.splice(idx, 1);
      }
    }

    return removed;
  }

  clear(): void {
    for (const item of this._tail) {
      super.delete(item);
    }

    // @ts-expect-error
    delete this._tail;
    this._tail = [];
  }

  get size(): number {
    return this._tail.length;
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
