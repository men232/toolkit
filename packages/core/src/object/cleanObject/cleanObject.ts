/**
 * Cleanup object
 *
 * ⚠️ Mutates original object
 * ⚠️ Removes symbols keys
 *
 * @example
 * const user = { id: 1, name: 'Andrew', roles: [], };
 *
 * cleanObject(user);
 *
 * console.log(user); // '{}'
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
