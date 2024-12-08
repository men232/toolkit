import { describe, expect, it } from 'vitest';
import { isDateObject } from './isDateObject';

describe('isDateObject', () => {
  it('should return true for a valid DateObject', () => {
    const validDateObject = { year: 2024, month: 11, date: 8 };
    expect(isDateObject(validDateObject)).toBe(true);
  });

  it('should return false for a DateObject missing properties', () => {
    const invalidDateObject = { year: 2024, month: 11 };
    expect(isDateObject(invalidDateObject)).toBe(false);
  });

  it('should return false if the properties are not numbers', () => {
    const invalidDateObject = { year: '2024', month: 11, date: 8 };
    expect(isDateObject(invalidDateObject)).toBe(false);
  });

  it('should return false if input is not an object', () => {
    expect(isDateObject('invalid')).toBe(false);
    expect(isDateObject(123)).toBe(false);
    expect(isDateObject([])).toBe(false);
  });

  it('should return true if the object has additional properties but valid structure', () => {
    const dateObjectWithExtraProps = {
      year: 2024,
      month: 11,
      date: 8,
      extra: 'value',
    };
    expect(isDateObject(dateObjectWithExtraProps)).toBe(true);
  });

  it('should return false if properties exist but are invalid numbers', () => {
    const invalidNumbers = { year: NaN, month: 11, date: 8 };
    expect(isDateObject(invalidNumbers)).toBe(false);
  });

  it('should return false for edge cases with missing numbers', () => {
    const edgeCase1 = { year: 2024, month: null, date: 8 };
    expect(isDateObject(edgeCase1)).toBe(false);

    const edgeCase2 = { year: 2024, month: 11, date: undefined };
    expect(isDateObject(edgeCase2)).toBe(false);
  });
});
