import { assertCapacity } from '../FixedMap/utils';

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
    if (!Map.prototype.has.call(this, key)) {
      this._tail.push(key);
    }

    Map.prototype.set.call(this, key, value);
    this._drain();

    return this;
  }

  delete(key: K): boolean {
    const removed = Map.prototype.delete.call(this, key);

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

    Map.prototype.clear.call(this);
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
      const key = this._tail.pop();

      key !== undefined && this.delete(key);
    }
  }
}
