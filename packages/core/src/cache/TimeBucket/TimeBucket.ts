import { FixedMap } from '../FixedMap';

interface Options {
  sizeMs: number;
  capacity?: number;
}

export class TimeBucket<K = any, V = any> {
  private _pointer: number;
  private _sizeMs: number;
  private _bucket: FixedMap<K, V> | Map<K, V>;

  constructor({ capacity = Infinity, sizeMs }: Options) {
    assetSizeMs(sizeMs);

    this._sizeMs = sizeMs;
    this._pointer = 0;
    this._bucket = capacity === Infinity ? new Map() : new FixedMap(capacity);
  }

  get capacity(): number {
    if (this._bucket instanceof FixedMap) {
      return this._bucket.capacity;
    }

    return Infinity;
  }

  get sizeMs(): number {
    return this.sizeMs;
  }

  set sizeMs(value: number) {
    assetSizeMs(value);

    this._sizeMs = value;

    this._drainBucket();
  }

  get size(): number {
    return this._bucket.size;
  }

  set(key: K, value: V): this {
    this._drainBucket();
    this._bucket.set(key, value);

    return this;
  }

  get(key: K): any | undefined {
    this._drainBucket();
    return this._bucket.get(key);
  }

  has(key: K): boolean {
    this._drainBucket();
    return this._bucket.has(key);
  }

  delete(key: K): boolean {
    this._drainBucket();
    return this._bucket.delete(key);
  }

  clear() {
    this._pointer = 0;
    this._drainBucket();
  }

  keys(): IterableIterator<K> {
    this._drainBucket();

    return this._bucket.keys();
  }

  values(): IterableIterator<V> {
    this._drainBucket();

    return this._bucket.values();
  }

  entries(): IterableIterator<[K, V]> {
    this._drainBucket();

    return this._bucket.entries();
  }

  private _drainBucket() {
    const newPointer = bucketPointer(this._sizeMs);

    if (newPointer !== this._pointer) {
      const capacity =
        this._bucket instanceof FixedMap ? this._bucket.capacity : Infinity;

      // @ts-expect-error
      delete this._bucket;

      this._pointer = newPointer;
      this._bucket = capacity === Infinity ? new Map() : new FixedMap(capacity);
    }
  }
}

function assetSizeMs(value: unknown) {
  if (typeof value !== 'number' || isNaN(value)) {
    throw new TypeError('msSize must be a number');
  }

  if (value <= 0) {
    throw new TypeError('msSize must be more then 0.');
  }
}

function bucketPointer(size: number): number {
  return Math.floor(Date.now() / size) * size;
}
