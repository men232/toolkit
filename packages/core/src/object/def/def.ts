/**
 * Define not enumerable property in object
 */
export const def = (
  obj: object,
  key: string | symbol,
  value: any,
  writable = false,
) => {
  Object.defineProperty(obj, key, {
    configurable: true,
    enumerable: false,
    writable,
    value,
  });
};
