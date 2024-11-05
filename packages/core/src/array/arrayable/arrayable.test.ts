import { describe, expect, test } from 'vitest';
import { arrayable } from './arrayable';

describe('arrayable', () => {
  test('should returns same array', () => {
    const array: (number | undefined)[] = [1, 2, 3];

    expect(arrayable(array)).toBe(array);
  });

  test('string parsing', () => {
    expect(arrayable('1,2,3')).toStrictEqual(['1', '2', '3']);
  });

  test('string parsing + trim', () => {
    expect(arrayable(' 1 , 2 , 3 ')).toStrictEqual(['1', '2', '3']);
  });

  test('single value converted to array', () => {
    expect(arrayable(1)).toStrictEqual([1]);
  });
});
