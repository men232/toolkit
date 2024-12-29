import { describe, expect, it } from 'vitest';
import { isTimeValue } from './isTimeValue';

describe('isTimeValue', () => {
  it('should returns true for valid TimeObject values', () => {
    expect(isTimeValue({ h: 15, m: 30 })).toBe(true); // Valid TimeObject
    expect(isTimeValue({ h: 0, m: 0 })).toBe(true); // Edge case: Start of the day
    expect(isTimeValue({ h: 23, m: 59 })).toBe(true); // Edge case: End of the day
  });

  it('should returns false for invalid TimeObject values', () => {
    expect(isTimeValue({ h: 25, m: 0 })).toBe(false); // Invalid hour
    expect(isTimeValue({ h: 23, m: 60 })).toBe(false); // Invalid minute
    expect(isTimeValue({ h: '15', m: '30' })).toBe(false); // Incorrect types
    expect(isTimeValue({})).toBe(false); // Missing properties
    expect(isTimeValue(null)).toBe(false); // Null value
  });

  it('should returns true for valid TimeString values', () => {
    expect(isTimeValue('15:30')).toBe(true); // Valid TimeString
    expect(isTimeValue('00:00')).toBe(true); // Edge case: Start of the day
    expect(isTimeValue('23:59')).toBe(true); // Edge case: End of the day
  });

  it('should returns false for invalid TimeString values', () => {
    expect(isTimeValue('25:00')).toBe(false); // Invalid hour
    expect(isTimeValue('23:60')).toBe(false); // Invalid minute
    expect(isTimeValue('15:30:00')).toBe(false); // Includes seconds
    expect(isTimeValue('invalid')).toBe(false); // Non-numeric string
    expect(isTimeValue('')).toBe(false); // Empty string
  });

  it('should returns false for non-TimeValue inputs', () => {
    expect(isTimeValue(1530)).toBe(false); // Number
    expect(isTimeValue({})).toBe(false); // Object without correct properties
    expect(isTimeValue([])).toBe(false); // Array
    expect(isTimeValue(null)).toBe(false); // Null
    expect(isTimeValue(undefined)).toBe(false); // Undefined
    expect(isTimeValue({ h: 0.1, m: 0.1 })).toBe(false); // Undefined
  });
});
