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
export const toMap = <T extends object>(obj: T): Map<keyof T, T[keyof T]> => {
  const map = new Map<any, any>(Object.entries(obj));

  for (const symbol of Object.getOwnPropertySymbols(obj)) {
    map.set(symbol, (obj as any)[symbol]);
  }

  return map;
};
