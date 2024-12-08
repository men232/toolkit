import { describe, expect, it } from 'vitest';
import { isValidWeekDay } from './isValidWeekDay';

describe('isValidWeekDay', () => {
  it('should return true for valid weekday numbers (1 to 7)', () => {
    expect(isValidWeekDay(1)).toBe(true);
    expect(isValidWeekDay(2)).toBe(true);
    expect(isValidWeekDay(3)).toBe(true);
    expect(isValidWeekDay(4)).toBe(true);
    expect(isValidWeekDay(5)).toBe(true);
    expect(isValidWeekDay(6)).toBe(true);
    expect(isValidWeekDay(7)).toBe(true);
  });

  it('should return false for numbers outside the valid weekday range', () => {
    expect(isValidWeekDay(0)).toBe(false);
    expect(isValidWeekDay(8)).toBe(false);
    expect(isValidWeekDay(-1)).toBe(false);
  });

  it('should return false for non-numeric values', () => {
    expect(isValidWeekDay('1')).toBe(false);
    expect(isValidWeekDay(null)).toBe(false);
    expect(isValidWeekDay(undefined)).toBe(false);
    expect(isValidWeekDay({})).toBe(false);
    expect(isValidWeekDay([])).toBe(false);
  });

  it('should return false for non-integer numbers', () => {
    expect(isValidWeekDay(1.5)).toBe(false);
    expect(isValidWeekDay(-3.7)).toBe(false);
  });
});
