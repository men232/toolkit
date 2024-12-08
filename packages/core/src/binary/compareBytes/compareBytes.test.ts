import { describe, expect, it } from 'vitest';
import { compareBytes } from './compareBytes';

describe('compareBytes', () => {
  it('returns true for two identical Uint8Array objects', () => {
    const array1 = new Uint8Array([1, 2, 3, 4]);
    const array2 = new Uint8Array([1, 2, 3, 4]);

    expect(compareBytes(array1, array2)).toBe(true);
  });

  it('returns false for arrays with different lengths', () => {
    const array1 = new Uint8Array([1, 2, 3]);
    const array2 = new Uint8Array([1, 2, 3, 4]);

    expect(compareBytes(array1, array2)).toBe(false);
  });

  it('returns false for arrays with same length but different content', () => {
    const array1 = new Uint8Array([1, 2, 3, 4]);
    const array2 = new Uint8Array([1, 2, 3, 5]);

    expect(compareBytes(array1, array2)).toBe(false);
  });

  it('returns true for two empty arrays', () => {
    const array1 = new Uint8Array([]);
    const array2 = new Uint8Array([]);

    expect(compareBytes(array1, array2)).toBe(true);
  });

  it('handles large identical arrays efficiently', () => {
    const array1 = new Uint8Array(10000).fill(42);
    const array2 = new Uint8Array(10000).fill(42);

    expect(compareBytes(array1, array2)).toBe(true);
  });

  it('returns false when one array is a prefix of the other', () => {
    const array1 = new Uint8Array([1, 2, 3, 4]);
    const array2 = new Uint8Array([1, 2, 3]);

    expect(compareBytes(array1, array2)).toBe(false);
  });
});
