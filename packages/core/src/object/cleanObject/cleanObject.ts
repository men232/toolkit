/**
 * Cleanup object
 *
 * ⚠️ Mutates original object
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
  Object.keys(input).forEach((key: string) => {
    delete input[key];
  });
};
