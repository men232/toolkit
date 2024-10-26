import { assertCapacity } from '../FixedMap/utils';

/**
 * Same as `WeakMap` but with fixed capacity
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
