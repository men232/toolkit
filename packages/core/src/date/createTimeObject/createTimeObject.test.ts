import { describe, expect, it } from 'vitest';
import { createTimeObject } from './createTimeObject';

describe('createTimeObject', () => {
  it('should create a TimeObject from a valid Date object', () => {
    const date = new Date('2024-12-08T15:30:00');
    const result = createTimeObject(date);
    expect(result).toEqual({ h: 15, m: 30 });
  });

  it('should create a TimeObject from a valid timestamp', () => {
    const timestamp = new Date('2024-12-08T15:30:00').getTime();
    const result = createTimeObject(timestamp);
    expect(result).toEqual({ h: 15, m: 30 });
  });

  it('should create a TimeObject from a valid time string', () => {
    const timeString = '2024-12-08T15:30:00';
    const result = createTimeObject(timeString);
    expect(result).toEqual({ h: 15, m: 30 });
  });

  it('should return the same TimeObject when passed as input', () => {
    const timeObject = { h: 10, m: 45 };
    const result = createTimeObject(timeObject);
    expect(result).toEqual({ h: 10, m: 45 });
  });

  it('should return null for invalid input when returnsNullWhenInvalid is true', () => {
    const result = createTimeObject('invalid-date', true);
    expect(result).toBeNull();
  });

  it('should throw an error for invalid input when returnsNullWhenInvalid is false', () => {
    expect(() => createTimeObject('invalid-date')).toThrow(
      'Failed to time parse: invalid-date.',
    );
  });

  it('should handle edge cases for valid dates', () => {
    const edgeCaseDate = new Date('1970-01-01T00:00:00');
    const result = createTimeObject(edgeCaseDate);
    expect(result).toEqual({ h: 0, m: 0 });
  });

  it('should handle leap years correctly', () => {
    const leapYearDate = new Date('2024-02-29T12:00:00');
    const result = createTimeObject(leapYearDate);
    expect(result).toEqual({ h: 12, m: 0 });
  });
});
