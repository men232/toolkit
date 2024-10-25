/**
 * Sum array of numbers
 *
 * @example
 * console.log(sum([2, 2])); // 4
 *
 * @group Array
 */
export const sum = (values: number[]) => {
  return values.reduce((a, b) => a + b, 0);
};
