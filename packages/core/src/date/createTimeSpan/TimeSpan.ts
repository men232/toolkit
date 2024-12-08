export type TimeSpanUnit = 'ms' | 's' | 'm' | 'h' | 'd' | 'w';

const UNIT_TO_MS: Record<TimeSpanUnit, number> = {
  ms: 1,
  s: 1000,
  m: 1000 * 60,
  h: 1000 * 60 * 60,
  d: 1000 * 60 * 60 * 24,
  w: 1000 * 60 * 60 * 24 * 7,
};

/**
 * A class representing a span of time with a specific value and unit of measurement.
 * Provides methods for conversion between time units and arithmetic operations (add, subtract).
 */
export class TimeSpan {
  constructor(value: number, unit: TimeSpanUnit) {
    this.value = value;
    this.unit = unit;
  }

  /**
   * The numeric value of the time span
   */
  public value: number;

  /**
   * The unit of the time span.
   */
  public unit: TimeSpanUnit;

  /**
   * Converts the time span to milliseconds.
   *
   * @returns {number} The equivalent time span in milliseconds.
   * @example
   * const ts = new TimeSpan(2, 'h');
   * ts.milliseconds(); // Returns 7200000
   */
  public milliseconds(): number {
    const multiplier = UNIT_TO_MS[this.unit];
    return this.value * multiplier;
  }

  /**
   * Converts the time span to seconds.
   *
   * @returns {number} The equivalent time span in seconds.
   * @example
   * const ts = new TimeSpan(2, 'm');
   * ts.seconds(); // Returns 120
   */
  public seconds(): number {
    return this.milliseconds() / UNIT_TO_MS.s;
  }

  /**
   * Converts the time span to minutes.
   *
   * @returns {number} The equivalent time span in minutes.
   * @example
   * const ts = new TimeSpan(120, 's');
   * ts.minutes(); // Returns 2
   */
  public minutes(): number {
    return this.milliseconds() / UNIT_TO_MS.m;
  }

  /**
   * Converts the time span to hours.
   *
   * @returns {number} The equivalent time span in hours.
   * @example
   * const ts = new TimeSpan(120, 'm');
   * ts.hours(); // Returns 2
   */
  public hours(): number {
    return this.milliseconds() / UNIT_TO_MS.h;
  }

  /**
   * Converts the time span to days.
   *
   * @returns {number} The equivalent time span in days.
   * @example
   * const ts = new TimeSpan(48, 'h');
   * ts.days(); // Returns 2
   */
  public days(): number {
    return this.milliseconds() / UNIT_TO_MS.d;
  }

  /**
   * Converts the time span to weeks.
   *
   * @returns {number} The equivalent time span in weeks.
   * @example
   * const ts = new TimeSpan(14, 'd');
   * ts.weeks(); // Returns 2
   */
  public weeks(): number {
    return this.milliseconds() / UNIT_TO_MS.w;
  }

  /**
   * Adds a specified value and unit to the current time span.
   *
   * Returns new instance.
   *
   * @param {number} value - The value to add.
   * @param {TimeSpanUnit} [unit='ms'] - The unit of the value to add (default is milliseconds).
   * @returns {TimeSpan} A new TimeSpan instance with the added value.
   * @example
   * const ts = new TimeSpan(1, 'h');
   * ts.add(30, 'm'); // Represents 1.5 hours
   */
  public add(value: number, unit: TimeSpanUnit = 'ms'): TimeSpan {
    const multiplier = UNIT_TO_MS[unit];
    return new TimeSpan(this.milliseconds() + value * multiplier, 'ms');
  }

  /**
   * Subtracts a specified value and unit from the current time span.
   *
   * Returns new instance.
   *
   * @param {number} value - The value to subtract.
   * @param {TimeSpanUnit} [unit='ms'] - The unit of the value to subtract (default is milliseconds).
   * @returns {TimeSpan} A new TimeSpan instance with the subtracted value.
   * @example
   * const ts = new TimeSpan(1, 'h');
   * ts.subtract(30, 'm'); // Represents 30 minutes less than 1 hour
   */
  public subtract(value: number, unit: TimeSpanUnit = 'ms'): TimeSpan {
    const multiplier = UNIT_TO_MS[unit];
    return new TimeSpan(this.milliseconds() - value * multiplier, 'ms');
  }
}
