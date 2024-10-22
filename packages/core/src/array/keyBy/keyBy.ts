import type { IsPropertyKey, MaybePropertyKey } from './types';

export function keyBy<T, K extends MaybePropertyKey<T>>(
  array: T[],
  keyBy: K,
): Map<IsPropertyKey<T, K, K>, T> {
  const result = new Map();

  for (const item of array) {
    result.set((item as any)?.[keyBy], item);
  }

  return result;
}
