import { isString } from '@/is';

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
