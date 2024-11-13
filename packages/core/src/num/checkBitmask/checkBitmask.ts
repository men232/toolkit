/**
 * Check if bits are set in `number` bitmask
 *
 * @example
 * const scope = (1 << 1 | 1 << 2 | 1 << 3);
 *
 * checkBitmask(scope, 1 << 2); // true
 * checkBitmask(scope, 1 << 5); // false
 *
 * @group Numbers
 */
export function checkBitmask(scope: number, flag: number): boolean;

/**
 * Check if bits are set in `bigint` bitmask
 *
 * @example
 * const scope = (1n << 1n | 1n << 2n | 1n << 3n);
 *
 * checkBitmask(scope, 1n << 2n); // true
 * checkBitmask(scope, 1n << 5n); // false
 *
 * @group Numbers
 */
export function checkBitmask(scope: bigint, flag: bigint): boolean;

export function checkBitmask(scope: any, flag: any): boolean {
  return (scope & flag) === flag;
}
