import { describe, expect, it } from 'vitest';
import { weeksInYear } from './weeksInYear';

describe('weeksInYear', () => {
  it('should return 52 for a common year with 52 weeks', () => {
    expect(weeksInYear(2024)).toBe(52);
    expect(weeksInYear(2023)).toBe(52);
    expect(weeksInYear(2022)).toBe(52);
  });

  it('should return 53 for a year with 53 weeks', () => {
    expect(weeksInYear(2020)).toBe(53);
    expect(weeksInYear(2026)).toBe(53);
  });

  it('should handle edge cases at the start of the year', () => {
    expect(weeksInYear(1900)).toBe(52);
  });

  it('should handle leap years correctly', () => {
    expect(weeksInYear(2000)).toBe(52);
  });
});
