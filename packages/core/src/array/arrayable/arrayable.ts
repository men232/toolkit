import { isString } from '@/is';

/**
 * @group Array
 *
 * @description
 * Converts value into array
 *
 * @example
 * function sum(value: number | number[] | string) {
 *     const numbers = arrayable(value).map(v => parseInt(v)); // number[]
 *     return numbers.reduce((a, b) => a + b, 0);
 * }
 *
 * sum(1); // 1
 * sum([1, 2]); // 3
 * sum('1,2'); // 3
 */
export function arrayable<T>(
  value: T,
): Exclude<T extends Array<infer X> ? X : T, undefined>[] {
  const result: any = Array.isArray(value)
    ? value
    : value === null
      ? []
      : value === undefined
        ? []
        : isString(value)
          ? value
              .split(',')
              .map(v => v.trim())
              .filter(Boolean)
          : [value];

  return result;
}
