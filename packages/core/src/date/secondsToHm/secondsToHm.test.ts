import { describe, expect, it } from 'vitest';
import { secondsToHm } from './secondsToHm';

describe('secondsToHm', () => {
  it('should convert 3661 seconds to 1.01 (1 hour, 1 minute)', () => {
    expect(secondsToHm(3661)).toBe(1.01);
  });

  it('should convert 7322 seconds to 2.02 (2 hours, 2 minutes)', () => {
    expect(secondsToHm(7322)).toBe(2.02);
  });

  it('should convert exactly 3600 seconds to 1.00 (1 hour)', () => {
    expect(secondsToHm(3600)).toBe(1.0);
  });

  it('should handle 0 seconds correctly and return 0.00', () => {
    expect(secondsToHm(0)).toBe(0.0);
  });

  it('should handle edge case of 3599 seconds (just under an hour)', () => {
    expect(secondsToHm(3599)).toBe(0.59);
  });

  it('should round properly for decimal minutes', () => {
    expect(secondsToHm(3666)).toBe(1.01);
  });

  it('should handle large numbers of seconds', () => {
    expect(secondsToHm(123456)).toBe(34.17);
  });

  it('should handle invalid input by converting to a number safely', () => {
    expect(secondsToHm('3600' as any)).toBe(1.0);
    expect(secondsToHm(3600.5)).toBe(1.0);
  });
});
