export function deepFreeze<T extends object | unknown[]>(value: T): T {
  let currentValue: any = value;

  if (!currentValue || typeof currentValue !== 'object') return currentValue;

  Object.freeze(currentValue);

  if (Array.isArray(currentValue)) {
    for (const item of currentValue) {
      deepFreeze(item);
    }

    return currentValue as T;
  } else {
    for (const value of Object.values(currentValue)) {
      deepFreeze(value as any);
    }
  }

  return currentValue;
}
