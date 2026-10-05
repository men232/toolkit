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
  it('should accept one or two digits in each part', () => {
    expect(isTimeString('9:05')).toBe(true);
    expect(isTimeString('9:5')).toBe(true);
    expect(isTimeString('09:5')).toBe(true);
  });

  it('should reject empty parts and non-digit characters', () => {
    for (const value of [
      '12:',
      ':30',
      ':',
      '1.5:2',
      '1e1:0',
      '0x1:0',
      ' 9:05',
      '9: 05',
      '12:30 ',
      '-1:30',
      '+1:30',
      '123:00',
      '12:000',
    ]) {
      expect(isTimeString(value), value).toBe(false);
    }
  });
});
