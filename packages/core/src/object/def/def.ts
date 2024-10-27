/**
 * Define not enumerable property in object.
 *
 * @example
 * const USER_SYM = Symbol();
 * const user = { id: 1, name: 'Andrew' };
 *
 * // define hidden marker
 * def(user, USER_SYM, true);
 *
 * console.log(user[USER_SYM] === true); // true
 *
 * @group Object
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
