export function uniq<T extends any[]>(value: T): T {
  if (!Array.isArray(value)) {
    return [] as any;
  }

  return [...new Set(value)] as T;
}
