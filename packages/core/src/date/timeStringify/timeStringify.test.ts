import { describe, expect, it } from 'vitest';
import { timeStringify } from './timeStringify';

describe('timeStringify', () => {
  it('should converts a time object to a string', () => {
    expect(timeStringify({ h: 9, m: 5 })).toBe('09:05');
    expect(timeStringify({ h: 23, m: 45 })).toBe('23:45');
  });

  it('should handle invalid TimeObject', () => {
    expect(timeStringify({ h: 12, m: 99 }, true)).toEqual(null);
  });

  it('should formats a string time value correctly', () => {
    expect(timeStringify('7:30')).toBe('07:30');
    expect(timeStringify('0:0')).toBe('00:00');
  });

  it('should handles invalid input gracefully when returnsNullWhenInvalid is true', () => {
    expect(timeStringify('invalid', true)).toBeNull();
    expect(timeStringify({} as any, true)).toBeNull();
  });

  it('should throws an error for invalid input when returnsNullWhenInvalid is false', () => {
    expect(() => timeStringify('invalid')).toThrow(
      'Failed to stringify time from',
    );
    expect(() => timeStringify({} as any)).toThrow(
      'Failed to stringify time from',
    );
  });
});
