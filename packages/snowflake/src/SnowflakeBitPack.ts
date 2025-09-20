/**
 * Based on: https://github.com/sapphiredev/utilities/blob/main/packages/snowflake/src/lib/Snowflake.ts
 */
import {
  type AnyFunction,
  type BitPack,
  assert,
  bigIntFromBytes,
  bitPack,
  isBigInt,
  isDate,
  isNumber,
  isString,
  timestampMs,
} from '@andrew_l/toolkit';
import {
  type DeconstructedSnowflake,
  MAX_INCREMENT,
  MAX_PROCESS_ID,
  MAX_WORKER_ID,
  Snowflake,
  type SnowflakeOptions,
} from './Snowflake';

var ENCODE_BIGINT_BUFFER = new Uint8Array(8);

export class SnowflakeBitPack {
  /**
   * Alias for {@link deconstruct}
   */
  public decode = this.deconstruct;

  /**
   * Internal reference of the epoch passed in the constructor
   * @internal
   */
  private readonly _epoch: number;

  /**
   * Internal incrementor for generating snowflakes
   * @internal
   */
  private _increment = 0;

  /**
   * The process ID that will be used by default in the generate method
   * @internal
   */
  private _processId = 1;

  /**
   * The worker ID that will be used by default in the generate method
   * @internal
   */
  private _workerId = 0;

  /**
   * @internal
   */
  private _timestamp = 0;

  private __buf: Uint8Array;

  private _generateBuffer: BitPack.Fn.Buffer<
    '_timestamp' | '_workerId' | '_processId' | '_increment'
  >;

  private _generateBigInt: BitPack.Fn.BigInt<
    '_timestamp' | '_workerId' | '_processId' | '_increment'
  >;

  /**
   * @param epoch the epoch to use
   */
  public constructor(opts: SnowflakeOptions | Date | number | bigint) {
    if (isDate(opts) || isNumber(opts)) {
      this._epoch = timestampMs(opts);
    } else if (isBigInt(opts)) {
      this._epoch = timestampMs(Number(opts));
    } else {
      const { increment = 0, processId = 1, workerId = 0, epoch } = opts;
      this._epoch = timestampMs(isBigInt(epoch) ? Number(epoch) : epoch);
      this.workerId = workerId;
      this.processId = processId;
      this.increment = increment;
    }

    const { bigint, buffer } = bitPack({
      totalBits: 64,
      fields: [
        { name: '_timestamp', bits: 42, take: 'low' },
        { name: '_workerId', bits: 5, take: 'low' },
        { name: '_processId', bits: 5, take: 'low' },
        { name: '_increment', bits: 12, take: 'low' },
      ],
      optimize: true,
    });

    this.__buf = new Uint8Array(8);
    this._generateBigInt = bigint;
    this._generateBuffer = buffer;
  }

  /**
   * The epoch for this snowflake, as a number
   */
  public get epoch(): number {
    return this._epoch;
  }

  /**
   * Gets the configured process ID
   */
  public get processId(): number {
    return this._processId;
  }

  /**
   * Sets the process ID that will be used by default for the {@link generate} method
   * @param value The new value, will be masked with `0b11111`
   */
  public set processId(value: number | bigint) {
    this._processId = Number(value) & MAX_PROCESS_ID;
  }

  /**
   * Gets the configured worker ID
   */
  public get workerId(): number {
    return this._workerId;
  }

  /**
   * Sets the worker ID that will be used by default for the {@link generate} method
   * @param value The new value, will be masked with `0b11111`
   */
  public set workerId(value: number | bigint) {
    this._workerId = Number(value) & MAX_WORKER_ID;
  }

  /**
   * Get incrementor for generating snowflakes
   */
  public get increment(): number {
    return this._increment;
  }

  /**
   * Sets the incrementor for generating snowflakes that will be used by default for the {@link generate} method
   * @param value The new value
   */
  public set increment(value: number | bigint) {
    this._increment = Number(value) & MAX_INCREMENT;
  }

  private _createSavePoint(): AnyFunction {
    var increment = this._increment;
    var workerId = this._workerId;
    var processId = this._processId;

    return () => {
      this._increment = increment;
      this._workerId = workerId;
      this._processId = processId;
    };
  }

  /**
   * Sets most lowest values for generating snowflakes that will be used by default for the {@link generate} method
   */
  setLowest(): void {
    this._increment = 0;
    this._workerId = 0;
    this._processId = 0;
  }

  /**
   * Sets most highest values for generating snowflakes that will be used by default for the {@link generate} method
   */
  setHighest(): void {
    this._increment = MAX_INCREMENT;
    this._workerId = MAX_WORKER_ID;
    this._processId = MAX_PROCESS_ID;
  }

  /**
   * Execute a function in context of most lowest values for generating snowflakes
   * @example
   * ```typescript
   * const epoch = new Date('2000-01-01T00:00:00.000Z');
   * const snowflake = new Snowflake();
   * const id = snowflake.withLowest((v) => v.generate(epoch)); // the lowest possible id for that epoch
   * ```
   */
  withLowest<Result = undefined>(
    fn: (instance: SnowflakeBitPack) => Result,
  ): Result {
    assert.fn(fn, 'withLowest expected a function as first argument');

    var reset = this._createSavePoint();
    this.setLowest();

    var result = fn(this);
    reset();

    return result;
  }

  /**
   * Execute a function in context of most highest values for generating snowflakes
   * @example
   * ```typescript
   * const epoch = new Date('2000-01-01T00:00:00.000Z');
   * const snowflake = new Snowflake();
   * const id = snowflake.withLowest((v) => v.generate(epoch)); // the highest possible id for that epoch
   * ```
   */
  withHighest<Result = undefined>(
    fn: (instance: SnowflakeBitPack) => Result,
  ): Result {
    assert.fn(fn, 'withHighest expected a function as first argument');

    var reset = this._createSavePoint();

    this.setHighest();

    var result = fn(this);
    reset();

    return result;
  }

  /**
   * Generates a Snowflake ID as bigint.
   */
  public generate(timestamp: Date | number = Date.now()): bigint {
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    if (!isNumber(timestamp)) {
      throw new Error(
        `"timestamp" argument must be a number or Date (received ${typeof timestamp})`,
      );
    }

    this._timestamp = timestamp - this._epoch;
    var res = this._generateBigInt(this as any);
    this._increment = (this._increment + 1) & MAX_INCREMENT;

    return res;
  }

  /**
   * Generates a Snowflake ID as a `Uint8Array` buffer.
   *
   * ⚠️ Returns a reference to the **same** internal `Uint8Array` instance.
   * Its contents may be overwritten on the next ID generation call.
   *
   * This method is intended for high-performance scenarios where you
   * immediately transform the buffer (e.g., to base62) before calling again.
   * Avoid storing or mutating the returned buffer directly.
   */
  public generateBufferUnsafe(
    timestamp: Date | number = Date.now(),
  ): Uint8Array {
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    if (!isNumber(timestamp)) {
      throw new Error(
        `"timestamp" argument must be a number or Date (received ${typeof timestamp})`,
      );
    }

    this._timestamp = timestamp - this._epoch;
    this._generateBuffer(this as any);
    this._increment = (this._increment + 1) & MAX_INCREMENT;

    return this.__buf;
  }

  /**
   * Generates a snowflake given an epoch and optionally a timestamp
   * @example
   * ```typescript
   * const epoch = new Date('2000-01-01T00:00:00.000Z');
   * const snowflake = new Snowflake({ epoch }).generate();
   * ```
   * @returns A unique snowflake as Uint8Array
   */
  public generateBuffer(timestamp: Date | number = Date.now()): Uint8Array {
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    if (!isNumber(timestamp)) {
      throw new Error(
        `"timestamp" argument must be a number or Date (received ${typeof timestamp})`,
      );
    }

    var increment = this._increment;
    this._increment = (this._increment + 1) & MAX_INCREMENT;

    // Calculate the timestamp delta
    var timestampDelta = timestamp - this._epoch;

    // Split into 32-bit parts for bitwise operations
    var timestampHigh = Math.floor(timestampDelta / 0x100000000);
    var timestampLow = timestampDelta >>> 0;

    var high32 = ((timestampHigh << 22) | (timestampLow >>> 10)) >>> 0;
    var low32 =
      ((timestampLow << 22) |
        (this._workerId << 17) |
        (this._processId << 12) |
        (increment & MAX_INCREMENT)) >>>
      0;

    var buffer = new Uint8Array(8);

    buffer[0] = high32 >>> 24;
    buffer[1] = high32 >>> 16;
    buffer[2] = high32 >>> 8;
    buffer[3] = high32;
    buffer[4] = low32 >>> 24;
    buffer[5] = low32 >>> 16;
    buffer[6] = low32 >>> 8;
    buffer[7] = low32;

    return buffer;
  }

  /**
   * Deconstructs a snowflake given a snowflake ID
   * @param id the snowflake to deconstruct
   * @returns a deconstructed snowflake
   * @example
   * ```typescript
   * const epoch = new Date('2000-01-01T00:00:00.000Z');
   * const snowflake = new Snowflake(epoch).deconstruct('3971046231244935168');
   * ```
   */
  public deconstruct(id: string | bigint | Uint8Array): DeconstructedSnowflake {
    var high32: number, low32: number;

    if (id instanceof Uint8Array) {
      // Convert from Uint8Array
      high32 = ((id[0] << 24) | (id[1] << 16) | (id[2] << 8) | id[3]) >>> 0;
      low32 = ((id[4] << 24) | (id[5] << 16) | (id[6] << 8) | id[7]) >>> 0;
    } else if (isBigInt(id)) {
      return this.deconstruct(bigintToBuffer(id));
    } else {
      // Convert from string
      return this.deconstruct(bigintToBuffer(BigInt(id)));
    }

    return {
      id: BigInt(high32) * 0x100000000n + BigInt(low32),
      timestamp: high32 * 0x400 + (low32 >>> 22) + this._epoch,
      workerId: (low32 >>> 17) & MAX_WORKER_ID,
      processId: (low32 >>> 12) & MAX_PROCESS_ID,
      increment: low32 & MAX_INCREMENT,
      epoch: this._epoch,
    };
  }

  /**
   * Retrieves the timestamp field's value from a snowflake.
   * @param id The snowflake to get the timestamp value from.
   * @returns The UNIX timestamp that is stored in `id`.
   */
  public timestampFrom(id: string | bigint | Uint8Array): number {
    if (isString(id) || isBigInt(id)) {
      return this.timestampFrom(Snowflake.bufferFrom(id));
    }

    var high32 = ((id[0] << 24) | (id[1] << 16) | (id[2] << 8) | id[3]) >>> 0;
    var low32 = ((id[4] << 24) | (id[5] << 16) | (id[6] << 8) | id[7]) >>> 0;

    return high32 * 0x400 + (low32 >>> 22) + this._epoch;
  }

  /**
   * Returns a number indicating whether a reference snowflake comes before, or after, or is same as the given
   * snowflake in sort order.
   * @param a The first snowflake to compare.
   * @param b The second snowflake to compare.
   * @returns `-1` if `a` is older than `b`, `0` if `a` and `b` are equals, `1` if `a` is newer than `b`.
   */
  public static compare(
    a: string | bigint | Uint8Array,
    b: string | bigint | Uint8Array,
  ): -1 | 0 | 1 {
    if (isString(a)) {
      a = BigInt(a);
    } else if (a instanceof Uint8Array) {
      a = bigIntFromBytes(a);
    }

    if (isString(b)) {
      b = BigInt(b);
    } else if (b instanceof Uint8Array) {
      b = bigIntFromBytes(b);
    }

    return a === b ? 0 : a < b ? -1 : 1;
  }

  /**
   * Parse value as Uint8Array buffer
   */
  public static bufferFrom(value: bigint | string): Uint8Array {
    if (isString(value)) value = BigInt(value);

    return new Uint8Array(bigintToBuffer(value));
  }
}

function bigintToBuffer(value: bigint): Uint8Array {
  if (value < 0n) {
    value = value * -1n;
  }
  for (var i = 0; i < 8; i++) {
    ENCODE_BIGINT_BUFFER[i] = Number(
      (value >> BigInt((8 - i - 1) * 8)) & 0xffn,
    );
  }
  return ENCODE_BIGINT_BUFFER;
}
