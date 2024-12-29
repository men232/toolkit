import { describe, expect, it } from 'vitest';
import { dateInSeconds } from './dateInSeconds';

describe('dateInSeconds', () => {
  it('should returns a date the given number of seconds in the future', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInSeconds(60, now);
    expect(result).toEqual(new Date('2023-01-01T00:01:00Z'));
  });

  it('should returns a date the given number of seconds in the past', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInSeconds(-30, now);
    expect(result).toEqual(new Date('2022-12-31T23:59:30Z'));
  });

  it('should uses the current time as the default base time', () => {
    const now = Date.now();
    const result = dateInSeconds(10);
    expect(result.getTime()).toBeCloseTo(now + 10000, -2); // Allowing minor time differences
  });

  it('should handles a timestamp as the base time', () => {
    const timestamp = 1672531200000; // Corresponds to 2023-01-01T00:00:00Z
    const result = dateInSeconds(10, timestamp);
    expect(result).toEqual(new Date('2023-01-01T00:00:10Z'));
  });

  it('should handles zero seconds input correctly', () => {
    const now = new Date('2023-01-01T00:00:00Z');
    const result = dateInSeconds(0, now);
    expect(result).toEqual(now);
  });
});
