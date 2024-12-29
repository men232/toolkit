import { describe, expect, it } from 'vitest';
import { isTimeString } from './isTimeString';

describe('isTimeString', () => {
  it('should returns true for valid time strings', () => {
    expect(isTimeString('15:30')).toBe(true); // Valid hours and minutes
    expect(isTimeString('00:00')).toBe(true); // Edge case: Start of the day
    expect(isTimeString('23:59')).toBe(true); // Edge case: End of the day
  });

  it('should returns false for invalid time strings', () => {
    expect(isTimeString('26:00')).toBe(false); // Invalid hours
    expect(isTimeString('23:60')).toBe(false); // Invalid minutes
    expect(isTimeString('15:30:00')).toBe(false); // Includes seconds
    expect(isTimeString('invalid')).toBe(false); // Non-numeric string
    expect(isTimeString('')).toBe(false); // Empty string
    expect(isTimeString('15')).toBe(false); // Missing minutes
  });

  it('should returns false for non-string inputs', () => {
    expect(isTimeString(1530)).toBe(false); // Number
    expect(isTimeString({})).toBe(false); // Object
    expect(isTimeString([])).toBe(false); // Array
    expect(isTimeString(null)).toBe(false); // Null
    expect(isTimeString(undefined)).toBe(false); // Undefined
  });
});
