import { describe, expect, it } from 'vitest';
import { isTimeObject } from './isTimeObject';

describe('isTimeObject', () => {
  it('should return true for a valid TimeObject', () => {
    const validTimeObject = { h: 15, m: 30 };
    expect(isTimeObject(validTimeObject)).toBe(true);
  });

  it('should return false if missing "h" property', () => {
    const invalidTimeObject = { m: 30 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);
  });

  it('should return false if missing "m" property', () => {
    const invalidTimeObject = { h: 15 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);
  });

  it('should return false if "h" or "m" are not numbers', () => {
    const invalidTimeObject = { h: '15', m: 30 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);

    const invalidTimeObject2 = { h: 15, m: '30' };
    expect(isTimeObject(invalidTimeObject2)).toBe(false);
  });

  it('should return false if hour is out of range', () => {
    const invalidTimeObject = { h: -1, m: 30 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);

    const invalidTimeObject2 = { h: 24, m: 30 };
    expect(isTimeObject(invalidTimeObject2)).toBe(false);
  });

  it('should return false if minutes are out of range', () => {
    const invalidTimeObject = { h: 15, m: -1 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);

    const invalidTimeObject2 = { h: 15, m: 60 };
    expect(isTimeObject(invalidTimeObject2)).toBe(false);
  });

  it('should return false if input is not an object', () => {
    expect(isTimeObject('string')).toBe(false);
    expect(isTimeObject(123)).toBe(false);
    expect(isTimeObject([])).toBe(false);
  });

  it('should return false for edge cases with invalid numbers', () => {
    const invalidTimeObject = { h: NaN, m: 30 };
    expect(isTimeObject(invalidTimeObject)).toBe(false);

    const invalidTimeObject2 = { h: 15, m: NaN };
    expect(isTimeObject(invalidTimeObject2)).toBe(false);
  });
});
