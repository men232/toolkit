import { describe, expect, it } from 'vitest';
import { dateInDays } from './dateInDays';

describe('dateInDays', () => {
  it('should returns a date the given number of days in the future', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInDays(7, now);
    expect(result).toEqual(new Date('2023-01-08T00:00:00Z'));
  });

  it('should returns a date the given number of days in the past', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInDays(-5, now);
    expect(result).toEqual(new Date('2022-12-27T00:00:00Z'));
  });

  it('should uses the current time as the default base time', () => {
    const now = Date.now();
    const result = dateInDays(1);
    expect(result.getTime()).toBeCloseTo(now + 86400000, -2); // Allow for minor timing differences
  });

  it('should handles a timestamp as the base time', () => {
    const timestamp = 1672531200000; // Corresponds to 2023-01-01T00:00:00Z
    const result = dateInDays(2, timestamp);
    expect(result).toEqual(new Date('2023-01-03T00:00:00Z'));
  });

  it('should handles zero days input correctly', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInDays(0, now);
    expect(result).toEqual(now);
  });
});
