import type { TimeObject } from '@/types';
import { describe, expect, it } from 'vitest';
import { getRandomTime } from './getRandomTime';

const toMs = ({ h, m }: TimeObject) => {
  return h * 60 * 60 * 1000 + m * 60 * 1000;
};

const isAfterOrEqual = (t1: TimeObject, t2: TimeObject) => {
  return toMs(t1) >= toMs(t2);
};

const isBeforeOrEqual = (t1: TimeObject, t2: TimeObject) => {
  return toMs(t1) <= toMs(t2);
};

describe('getRandomTime', () => {
  it('should generate a random time within the full day range by default', () => {
    const result = getRandomTime();
    expect(result.h).toBeGreaterThanOrEqual(0);
    expect(result.h).toBeLessThanOrEqual(23);
    expect(result.m).toBeGreaterThanOrEqual(0);
    expect(result.m).toBeLessThanOrEqual(59);
  });

  it('should generate a random time within a custom range provided', () => {
    const startTime = { h: 8, m: 30 };
    const endTime = { h: 10, m: 30 };
    const result = getRandomTime(startTime, endTime);

    expect(isAfterOrEqual(result, startTime)).toBeTruthy();
    expect(isBeforeOrEqual(result, endTime)).toBeTruthy();
  });

  it('should respect edge case ranges with minimum valid times', () => {
    const result = getRandomTime({ h: 0, m: 0 }, { h: 0, m: 59 });
    expect(result.h).toBe(0);
    expect(result.m).toBeGreaterThanOrEqual(0);
    expect(result.m).toBeLessThanOrEqual(59);
  });

  it('should respect edge case ranges with maximum valid times', () => {
    const result = getRandomTime({ h: 23, m: 0 }, { h: 23, m: 59 });
    expect(result.h).toBe(23);
    expect(result.m).toBeGreaterThanOrEqual(0);
    expect(result.m).toBeLessThanOrEqual(59);
  });

  it('should handle narrow ranges correctly', () => {
    const result = getRandomTime({ h: 15, m: 15 }, { h: 15, m: 16 });
    expect(result.h).toBe(15);
    expect(result.m).toBeGreaterThanOrEqual(15);
    expect(result.m).toBeLessThanOrEqual(16);
  });
});
