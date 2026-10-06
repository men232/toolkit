import { describe, expect, it } from 'vitest';
import { hmToSeconds } from './hmToSeconds';

describe('hmToSeconds', () => {
  it('should convert 1.00 hours to 3600 seconds', () => {
    expect(hmToSeconds(1.0)).toBe(3600);
  });

  it('should convert 2.30 (2 hours and 30 minutes) to 9000 seconds', () => {
    expect(hmToSeconds(2.3)).toBe(9000);
  });

  it('should convert 0.15 (15 minutes) to 900 seconds', () => {
    expect(hmToSeconds(0.15)).toBe(900);
  });

  it('should convert 3.45 (3 hours and 45 minutes) to 13500 seconds', () => {
    expect(hmToSeconds(3.45)).toBe(13500);
  });

  it('should convert 0.00 to 0 seconds', () => {
    expect(hmToSeconds(0.0)).toBe(0);
  });

  it('should handle edge case of 0.59 (59 minutes) correctly', () => {
    expect(hmToSeconds(0.59)).toBe(3540);
  });

  it('should handle large inputs like 10.59 (10 hours and 59 minutes)', () => {
    expect(hmToSeconds(10.59)).toBe(39540);
  });

  it('should handle invalid input safely by converting it to a number', () => {
    expect(hmToSeconds('2.30' as any)).toBe(9000);
  });

  it('should return whole seconds for every HH.MM value of a day', () => {
    for (let h = 0; h < 24; h++) {
      for (let m = 0; m < 60; m++) {
        expect(hmToSeconds(Number(`${h}.${String(m).padStart(2, '0')}`))).toBe(
          h * 3600 + m * 60,
        );
      }
    }
  });

  it('should handle negative values', () => {
    expect(hmToSeconds(-1.3)).toBe(-5400);
    expect(hmToSeconds(-0.07)).toBe(-420);
  });
});
