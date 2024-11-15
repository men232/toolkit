const DEF_STR_ASSIGN_REGEXP = /\{{([A-z-_. ]*)\}}/g;
const DEF_STR_ASSIGN_METHOD = (obj: any, key: string) => obj[key];

/**
 * Replaces placeholders in the input string with values from the provided object.
 * The placeholders are denoted by `{{ key }}` syntax, where `key` is a property name in the object.
 * The function optionally allows a custom method to handle how the values are retrieved from the object.
 *
 * @param {string} str - The string with placeholders to be replaced. Placeholders are in the form of `{{key}}`.
 * @param {T} obj - The object whose properties will be used to replace the placeholders in the string.
 * @param method - An optional custom method
 *   to retrieve values from the object. The default method retrieves
 *   the values by accessing the object property directly using the `key`.
 *
 * @returns {string} The string with placeholders replaced by the corresponding values from the object.
 *
 * @example
 * const context = { name: 'Andrew', age: 30 };
 * console.log(strAssign('Hey {{ name }}! You are {{ age }} years old.', context));
 * // Output: 'Hey Andrew! You are 30 years old.'
 *
 * @example
 * // Using a custom method
 * const context2 = { firstName: 'Andrew', lastName: 'L.' };
 * const customMethod = (obj, key) => {
 *   if (key === 'name') {
 *     return obj.firstName + ' ' + obj.lastName;
 *   }
 *   return obj[key];
 * };
 * console.log(strAssign('Hello {{ name }}!', context2, customMethod));
 * // Output: 'Hello Andrew L.!'
 *
 * @group Strings
 */
export function strAssign<T extends object>(
  str: string,
  obj: T,
  method: (obj: T, key: string) => any = DEF_STR_ASSIGN_METHOD,
): string {
  return str.replace(DEF_STR_ASSIGN_REGEXP, (match, p1) => {
    const key = p1.trim();
    const value = method(obj, key);

    if (value === undefined || value === null) {
      return match;
    }

    return value;
  });
}
