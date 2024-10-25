/**
 * Round value to provided range

 * @example
 * const min = 5;
 * const max = 10;
 * console.log(clamp(7, min, max)) // 7
 * console.log(clamp(15, min, max)) // 10
 *
 * @group Numbers
 */
export const clamp = (num: number, min: number, max: number) =>
  Math.min(max, Math.max(min, num));
