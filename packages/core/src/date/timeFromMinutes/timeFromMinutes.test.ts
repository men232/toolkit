import { describe, expect, it } from 'vitest';
import { timeFromMinutes } from './timeFromMinutes';

describe('timeFromMinutes', () => {
  it('should parse regular number', () => {
    expect(timeFromMinutes(5)).toEqual({ h: 0, m: 5 });
  });

  it('should handle zero', () => {
    expect(timeFromMinutes(0)).toEqual({ h: 0, m: 0 });
  });

  it('should throw an error for unsupported input types when returnsNullWhenInvalid is false', () => {
    expect(() => timeFromMinutes(NaN)).toThrowError('Failed to time parse');
  });

  it('should return null for unsupported input types when returnsNullWhenInvalid is true', () => {
    expect(timeFromMinutes(NaN, true)).toBe(null);
  });

  it('should parse with hour', () => {
    expect(timeFromMinutes(65)).toEqual({ h: 1, m: 5 });
  });

  it('should handle +1 day', () => {
    expect(timeFromMinutes(1445)).toEqual({ h: 0, m: 5 });
  });

  it('should handle +5 day', () => {
    expect(timeFromMinutes(7205)).toEqual({ h: 0, m: 5 });
  });

  it('should handle -1 day', () => {
    expect(timeFromMinutes(-5)).toEqual({ h: 23, m: 55 });
  });

  it('should handle -5 day', () => {
    expect(timeFromMinutes(-7205)).toEqual({ h: 23, m: 55 });
  });
});
