import { isString } from '@/is';

type ItemType<T> =
  T extends Array<infer X>
    ? X
    : T extends string
      ? string
      : Exclude<T, null | undefined>;

/**
 * Converts value into array
 *
 * @example
 * function sum(value: number | number[]) {
 *   return arrayable(value).reduce((a, b) => a + b, 0);
 * }
 *
 * @group Array
 */
export function arrayable<T>(value: Readonly<T>): ItemType<T>[] {
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
