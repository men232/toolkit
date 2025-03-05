import { describe, expect, it } from 'vitest';
import { avgCircular } from './avgCircular';

describe('avgCircular', () => {
  it('result of valid numbers', () => {
    expect(avgCircular([480, 510, 540, 60, 1380], 1440)).toBeCloseTo(348.776);
  });

  it('should calculate the average correctly for time-based values', () => {
    const values = [23, 1, 2];
    const result = avgCircular(values, 24);
    expect(result).toBeCloseTo(0.675);
  });

  it('should calculate the average correctly for angle-based values (degrees)', () => {
    const values = [350, 10, 20];
    const result = avgCircular(values, 360);
    expect(result).toBeCloseTo(6.7);
  });

  it('should return 0 when no values are provided', () => {
    const result = avgCircular([], 24);
    expect(result).toBe(0);
  });

  it('should handle a single value correctly', () => {
    const result = avgCircular([5], 24);
    expect(result).toBe(5);
  });

  it('should handle large values correctly', () => {
    const values = [359, 1];
    const max = 360;
    const result = avgCircular(values, max);
    expect(result).toBeCloseTo(0, 1);
  });
});
