import { describe, expect, it } from 'vitest';
import { round2digits } from './round2digits';

describe('round2digits', () => {
  // Test for default rounding to 2 decimal places
  it('should round a number to 1 decimal place when 1 digit is specified', () => {
    expect(round2digits(3.3333333, 1)).toBe(3.3);
  });

  it('should round a number to 2 decimal places when 2 digits are specified', () => {
    expect(round2digits(3.3333333, 2)).toBe(3.33);
  });

  it('should round a number to 3 decimal places when 3 digits are specified', () => {
    expect(round2digits(3.3333333, 3)).toBe(3.333);
  });

  // Test rounding to integer (0 decimal places)
  it('should round a number to an integer when 0 digits are specified', () => {
    expect(round2digits(3.789, 0)).toBe(3);
  });

  // Test default behavior when no second argument is provided (round to 2 decimal places)
  it('should round to 2 decimal places by default if no digits are specified', () => {
    expect(round2digits(3.789)).toBe(3.79);
  });

  // Test negative numbers
  it('should correctly round a negative number to 2 decimal places', () => {
    expect(round2digits(-3.789, 2)).toBe(-3.79);
  });

  // Test zero value
  it('should return 0 when the value is 0', () => {
    expect(round2digits(0, 2)).toBe(0);
  });

  // Test when no digits are specified and the number is large
  it('should round large number to default 2 decimal places', () => {
    expect(round2digits(1234567.891234)).toBe(1234567.89);
  });

  // Test rounding with higher precision
  it('should round a number to the specified decimal places', () => {
    expect(round2digits(0.123456789, 5)).toBe(0.12346);
  });
});
