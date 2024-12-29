import { describe, expect, it } from 'vitest';
import { timestampMs } from './timestampMs';

describe('timestampMs', () => {
  it('returns milliseconds for a Date object', () => {
    const date = new Date('2023-01-01T00:00:00Z');
    expect(timestampMs(date)).toBe(1672531200000);
  });

  it('returns the same value for a timestamp input', () => {
    const timestamp = 1672531200000;
    expect(timestampMs(timestamp)).toBe(1672531200000);
  });

  it('parses and returns milliseconds for a valid date string', () => {
    expect(timestampMs('2023-01-01T00:00:00Z')).toBe(1672531200000);
  });

  it('returns 0 for an invalid date string', () => {
    expect(timestampMs('invalid-date')).toBe(0);
  });

  it('returns the current timestamp if no input is provided', () => {
    const now = Date.now();
    const result = timestampMs();
    expect(result).toBeCloseTo(now, -2); // Allow for minor timing differences
  });

  it('returns 0 for invalid input types', () => {
    expect(timestampMs(null as any)).toBe(0);
    expect(timestampMs({} as any)).toBe(0);
    expect(timestampMs([] as any)).toBe(0);
  });
});
