/**
 * Based on: https://github.com/sapphiredev/utilities/blob/main/packages/snowflake/src/lib/Snowflake.ts
 */
import {
  type AnyFunction,
  assert,
  bigIntBytes,
  bigIntFromBytes,
  isBigInt,
  isDate,
  isNumber,
  isString,
  timestampMs,
} from '@andrew_l/toolkit';

/**
 * Object returned by Snowflake#deconstruct
 */
export interface DeconstructedSnowflake {
  /**
   * The id as a number
   */
  id: bigint;

  /**
   * The timestamp stored in the snowflake
   */
  timestamp: number;

  /**
   * The worker id stored in the snowflake
   */
  workerId: number;

  /**
   * The process id stored in the snowflake
   */
  processId: number;

  /**
   * The increment stored in the snowflake
   */
  increment: number;

  /**
   * The epoch to use in the snowflake
   */
  epoch: number;
}

/**
 * Options for Snowflake
 */
export interface SnowflakeOptions {
  /**
   * Timestamp or date of the snowflake to generate
   */
  epoch: number | bigint | Date;

  /**
   * The increment to use
   * @default 0
   * @remark keep in mind that this number is auto-incremented between generate calls
   */
  increment?: number | bigint;

  /**
   * The worker ID to use, will be truncated to 5 bits (0-31)
   * @default 0
   */
  workerId?: number | bigint;

  /**
   * The process ID to use, will be truncated to 5 bits (0-31)
   * @default 1
   */
  processId?: number | bigint;
}

/**
 * The maximum value the `workerId` field accepts in snowflakes.
 */
export var MAX_WORKER_ID = 0x1f;

/**
 * The maximum value the `processId` field accepts in snowflakes.
 */
export var MAX_PROCESS_ID = 0x1f;

/**
 * The maximum value the `increment` field accepts in snowflakes.
 */
export var MAX_INCREMENT = 0xfff;

/**
 * A class for generating and deconstructing Twitter snowflakes.
 *
 * A {@link https://developer.twitter.com/en/docs/twitter-ids Twitter snowflake}
 * is a 64-bit unsigned integer with 4 fields that have a fixed epoch value.
 *
 * If we have a snowflake `266241948824764416` we can represent it as binary:
 * ```
 * 64                                          22     17     12          0
 * 000000111011000111100001101001000101000000  00001  00000  000000000000
 *          number of ms since epoch           worker  pid    increment
 * ```
 *
 * @group Main
 */
export class Snowflake {
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
  private _buffer: Uint8Array;

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

    this._buffer = new Uint8Array(8);
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
  withLowest<Result = undefined>(fn: (instance: Snowflake) => Result): Result {
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
  withHighest<Result = undefined>(fn: (instance: Snowflake) => Result): Result {
    assert.fn(fn, 'withHighest expected a function as first argument');

    var reset = this._createSavePoint();

    this.setHighest();

    var result = fn(this);
    reset();

    return result;
  }

  /**
   * Generates a Snowflake ID as a `Uint8Array` buffer.
   */
  public generate(timestamp: Date | number = Date.now()): bigint {
    if (timestamp instanceof Date) timestamp = timestamp.getTime();
    if (!isNumber(timestamp)) {
      throw new Error(
        `"timestamp" argument must be a number or Date (received ${typeof timestamp})`,
      );
    }

    var increment = this._increment;
    this._increment = (this._increment + 1) & MAX_INCREMENT;

    return (
      (BigInt(timestamp - this._epoch) << 22n) |
      (BigInt(this._workerId & MAX_WORKER_ID) << 17n) |
      (BigInt(this._processId & MAX_PROCESS_ID) << 12n) |
      BigInt(increment & MAX_INCREMENT)
    );
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

    var increment = this._increment;
    this._increment = (this._increment + 1) & MAX_INCREMENT;

    // Calculate the timestamp delta
    var timestampDelta = timestamp - this._epoch;

    // Split into 32-bit parts for bitwise operations
    var timestampHigh = Math.floor(timestampDelta / 0xffffffff);
    var timestampLow = timestampDelta >>> 0;

    var high32 = ((timestampHigh << 22) | (timestampLow >>> 10)) >>> 0;
    var low32 =
      ((timestampLow << 22) |
        (this._workerId << 17) |
        (this._processId << 12) |
        (increment & MAX_INCREMENT)) >>>
      0;

    var buffer = this._buffer;

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
   * Generates a snowflake given an epoch and optionally a timestamp
   * @example
   * ```typescript
   * const epoch = new Date('2000-01-01T00:00:00.000Z');
   * const snowflake = new Snowflake({ epoch }).generate();
   * ```
   * @returns A unique snowflake as Uint8Array
   */
  public generateBuffer(timestamp: Date | number = Date.now()): Uint8Array {
    this.generateBufferUnsafe(timestamp);
    return new Uint8Array(this._buffer);
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
      return this.deconstruct(bigIntBytes(id));
    } else {
      // Convert from string
      return this.deconstruct(bigIntBytes(BigInt(id)));
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

    var buf = bigIntBytes(value);
    var bufSize = buf.byteLength;

    // Add padding
    if (buf.byteLength < 8) {
      var buf2 = new Uint8Array(8);
      buf2.set(buf, 8 - bufSize);
      buf = buf2;
    }

    return buf;
  }
}
