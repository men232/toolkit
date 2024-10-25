export function checkBitmask(scope: number, flag: number): boolean;
export function checkBitmask(scope: bigint, flag: bigint): boolean;

/**
 * Check if bits are set in bitmask
 *
 * @example
 * const scope = (1 << 1 | 1 << 2 | 1 << 3);
 * console.log(checkBitmask(scope, 1 << 2)) // true
 * console.log(checkBitmask(scope, 1 << 5)) // false
 *
 * @group Numbers
 */
export function checkBitmask(scope: any, flag: any): boolean {
  return (scope & flag) === flag;
}
