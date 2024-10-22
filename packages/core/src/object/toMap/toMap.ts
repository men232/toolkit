/**
 * Converts object into Map
 */
export const toMap = <KValue = string, TValue = unknown>(
  arr: Readonly<any[]>,
  keyBy: string,
): Map<KValue, TValue> => {
  const map = new Map<KValue, TValue>();

  for (const item of arr) {
    const key = item[keyBy];
    map.set(key as KValue, item);
  }

  return map;
};
