import { describe, expect, it } from 'vitest';
import { concatenateBytes } from './concatenateBytes';

describe('concatenateBytes', () => {
  it('concatenates two non-empty Uint8Array objects', () => {
    const array1 = new Uint8Array([1, 2, 3]);
    const array2 = new Uint8Array([4, 5, 6]);
    const expected = new Uint8Array([1, 2, 3, 4, 5, 6]);

    const result = concatenateBytes(array1, array2);
    expect(result).toEqual(expected);
  });

  it('concatenates when the first array is empty', () => {
    const array1 = new Uint8Array([]);
    const array2 = new Uint8Array([4, 5, 6]);
    const expected = new Uint8Array([4, 5, 6]);

    const result = concatenateBytes(array1, array2);
    expect(result).toEqual(expected);
  });

  it('concatenates when the second array is empty', () => {
    const array1 = new Uint8Array([1, 2, 3]);
    const array2 = new Uint8Array([]);
    const expected = new Uint8Array([1, 2, 3]);

    const result = concatenateBytes(array1, array2);
    expect(result).toEqual(expected);
  });

  it('concatenates two empty arrays', () => {
    const array1 = new Uint8Array([]);
    const array2 = new Uint8Array([]);
    const expected = new Uint8Array([]);

    const result = concatenateBytes(array1, array2);
    expect(result).toEqual(expected);
  });

  it('does not modify the original arrays', () => {
    const array1 = new Uint8Array([1, 2, 3]);
    const array2 = new Uint8Array([4, 5, 6]);

    concatenateBytes(array1, array2);

    expect(array1).toEqual(new Uint8Array([1, 2, 3]));
    expect(array2).toEqual(new Uint8Array([4, 5, 6]));
  });

  it('handles large arrays', () => {
    const array1 = new Uint8Array(1000).fill(1);
    const array2 = new Uint8Array(1000).fill(2);
    const expected = new Uint8Array(2000).fill(1, 0, 1000).fill(2, 1000);

    const result = concatenateBytes(array1, array2);
    expect(result).toEqual(expected);
  });
});
