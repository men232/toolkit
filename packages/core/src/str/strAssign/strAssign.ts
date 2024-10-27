const DEF_STR_ASSIGN_REGEXP = /\{{([A-z-_. ]*)\}}/g;
const DEF_STR_ASSIGN_METHOD = (obj: any, key: string) => obj[key];

/**
 * A util function for assign string with object
 *
 * @example
 * const context = { name: 'Andrew' };
 *
 * strAssign('Hey {{ name }}', context); // 'Hey Andrew'
 *
 * @group Strings
 */
export function strAssign(
  str: string,
  obj: object,
  method = DEF_STR_ASSIGN_METHOD,
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
