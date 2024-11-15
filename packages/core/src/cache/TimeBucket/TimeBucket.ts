import { FixedMap } from '../FixedMap';

export interface TimeBucketOptions {
  /**
   * The size of each time bucket in milliseconds. This is the interval at which
   * the records in the bucket will expire and be dropped.
   */
  sizeMs: number;

  /**
   * The maximum number of entries the bucket can hold. Once the capacity is
   * reached, the least recently used entry will be removed.
   * @default Infinity
   */
  capacity?: number;
}

/**
 * A time-based bucket that holds records for a specific interval defined by `sizeMs`.
 * The records in the bucket will be dropped once the interval elapses, based on the
 * current time. The `TimeBucket` is designed to avoid using timers to track expirations.
 *
 * It can be used to store data that expires over fixed time intervals (e.g., caching,
 * throttling).
 *
 * @example
 * const bucket = new TimeBucket({ sizeMs: 1000, capacity: 10 });
 * bucket.set('key1', 'value1');
 * console.log(bucket.get('key1')); // 'value1'
 *
 * // After 1 second, the bucket will drop the expired records.
 *
 * @group Cache
 */
export class TimeBucket<K = any, V = any> {
  private _pointer: number;
  private _sizeMs: number;
  private _bucket: FixedMap<K, V> | Map<K, V>;

  constructor({ capacity = Infinity, sizeMs }: TimeBucketOptions) {
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
    this._drainBucket();
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

  forEach(
    callbackfn: (value: V, key: K, map: TimeBucket<K, V>) => void,
    thisArg?: any,
  ): void {
    this._drainBucket();
    return this._bucket.forEach((value, key) => {
      callbackfn(value, key, this);
    });
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
