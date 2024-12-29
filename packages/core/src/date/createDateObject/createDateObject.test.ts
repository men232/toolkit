import { describe, expect, it } from 'vitest';
import { createDateObject } from './createDateObject';

describe('createDateObject', () => {
  it('should create a DateObject from a valid Date object', () => {
    const date = new Date('2024-12-08T00:00:00Z');
    const result = createDateObject(date);
    expect(result).toEqual({ year: 2024, month: 12, date: 8 });
  });

  it('should create a DateObject from a valid timestamp', () => {
    const timestamp = new Date('2024-12-08T00:00:00Z').getTime();
    const result = createDateObject(timestamp);
    expect(result).toEqual({ year: 2024, month: 12, date: 8 });
  });

  it('should return the same DateObject when passed as input', () => {
    const dateObject = { year: 2024, month: 12, date: 8 };
    const result = createDateObject(dateObject);
    expect(result).toEqual(dateObject);
  });

  it('should return null for invalid input when returnsNullWhenInvalid is true', () => {
    const result = createDateObject('invalid-date' as any, true);
    expect(result).toBeNull();
  });

  it('should throw an error for invalid input when returnsNullWhenInvalid is false', () => {
    expect(() => createDateObject('invalid-date' as any)).toThrow(
      'Failed to date parse: invalid-date.',
    );
  });

  it('should handle edge cases for valid dates', () => {
    const edgeCaseDate = new Date('1970-01-01T00:00:00Z');
    const result = createDateObject(edgeCaseDate);
    expect(result).toEqual({ year: 1970, month: 1, date: 1 });
  });

  it('should handle YYYY-MM-DD', () => {
    const result = createDateObject('2024-01-02');
    expect(result).toEqual({ year: 2024, month: 1, date: 2 });
  });

  it('should handle leap years correctly', () => {
    const leapYearDate = new Date('2024-02-29T12:00:00Z');
    const result = createDateObject(leapYearDate);
    expect(result).toEqual({ year: 2024, month: 2, date: 29 });
  });

  it('should throw an error for unsupported input types when returnsNullWhenInvalid is false', () => {
    expect(() => createDateObject([] as any)).toThrow(
      'Failed to date parse: .',
    );
  });

  it('should return null for unsupported input types when returnsNullWhenInvalid is true', () => {
    const result = createDateObject([] as any, true);
    expect(result).toBeNull();
  });
});
