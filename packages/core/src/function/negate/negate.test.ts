import { describe, expect, it } from 'vitest';
import { negate } from './negate';

describe('negate', () => {
  it('should negate the given predicate function', () => {
    expect(typeof negate(() => true)).toBe('function');
    expect(negate(() => true)()).toBe(false);
    expect(negate(() => false)()).toBe(true);

    function isEven(n: number) {
      return n % 2 === 0;
    }
    expect([1, 2, 3, 4, 5, 6].filter(negate(isEven))).toEqual([1, 3, 5]);
  });

  it('forwards this context to the predicate', () => {
    const ctx = { threshold: 10 };
    function isAboveThreshold(this: typeof ctx, n: number) {
      return n > this.threshold;
    }
    const notAbove = negate(isAboveThreshold);
    expect(notAbove.call(ctx, 5)).toBe(true);
    expect(notAbove.call(ctx, 15)).toBe(false);
  });

  it('forwards this context when called as a method', () => {
    const obj = {
      min: 0,
      max: 100,
      isOutOfRange(n: number) {
        return n < this.min || n > this.max;
      },
    };
    obj.isOutOfRange = negate(obj.isOutOfRange);
    expect(obj.isOutOfRange(50)).toBe(true);
    expect(obj.isOutOfRange(150)).toBe(false);
  });
});
