/**
 * Converts object into Map
 *
 * @example
 * const map = toMap({ user1: 'Andrew', user2: 'John' });
 *
 * map.get('user2'); // John
 *
 * @group Object
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
