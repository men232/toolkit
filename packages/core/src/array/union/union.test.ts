import { describe, expect, it } from 'vitest';
import { union } from './union';

describe('union', () => {
  it('should return the union of two arrays', () => {
    expect(union([2, 1], [2, 3])).toEqual([2, 1, 3]);
  });

  it('should return the union of three arrays', () => {
    expect(union([2, 1], [2, 3], [1, 4])).toEqual([2, 1, 3, 4]);
  });

  it('should handle empty arguments', () => {
    expect(union()).toEqual([]);
  });

  it('should handle one argument', () => {
    expect(union([1])).toEqual([1]);
  });
});
