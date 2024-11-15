/**
 * Removes all properties from the given object, including symbol keys.
 *
 * This function deletes all enumerable properties, both string and symbol keys, from the
 * input object. The object is directly mutated by this operation.
 *
 * ⚠️ **Mutates the original object**: The function modifies the input object in place.
 *
 * ⚠️ **Removes symbol keys**: Symbol-based keys are also deleted, unlike typical object
 * iteration methods.
 *
 * @param {Record<string, any>} input - The object to clean up. After execution, it will be empty.
 * @returns {void} This function does not return a value, as it mutates the input object directly.
 *
 * @example
 * const user = { id: 1, name: 'Andrew', roles: [], [Symbol('unique')]: 'symbolValue' };
 * cleanObject(user);
 *
 * console.log(user); // Outputs: {}
 *
 * @example
 * const settings = { theme: 'dark', [Symbol('private')]: 'secret' };
 * cleanObject(settings);
 *
 * console.log(settings); // Outputs: {}
 *
 * @group Object
 */
export const cleanObject = (input: Record<string, any>) => {
  [...Object.keys(input), ...Object.getOwnPropertySymbols(input)].forEach(
    (key: any) => {
      delete input[key];
    },
  );
};
