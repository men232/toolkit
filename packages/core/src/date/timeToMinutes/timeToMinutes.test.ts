import { describe, expect, it } from 'vitest';
import { timeToMinutes } from './timeToMinutes';

describe('timeToMinutes', () => {
  it('should converts a string time value to total minutes', () => {
    expect(timeToMinutes('2:30')).toBe(150);
    expect(timeToMinutes('0:45')).toBe(45);
  });

  it('should converts an object time value to total minutes', () => {
    expect(timeToMinutes({ h: 1, m: 15 })).toBe(75);
    expect(timeToMinutes({ h: 0, m: 30 })).toBe(30);
  });

  it('should handles edge cases', () => {
    expect(timeToMinutes('0:00')).toBe(0);
    expect(timeToMinutes({ h: 0, m: 0 })).toBe(0);
  });

  it('throws an error for invalid time values', () => {
    expect(() => timeToMinutes(null as any)).toThrow('Failed to time');
    expect(() => timeToMinutes('invalid' as any)).toThrow('Failed to time');
    expect(() => timeToMinutes({} as any)).toThrow('Failed to time');
  });
});
