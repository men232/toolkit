/**
 * @example
 * const PERMISSIONS = {
 *   USER_CREATE: 1 << 0,
 *   USER_UPDATE: 1 << 1,
 *   USER_DELETE: 1 << 2,
 *   USER_LIST: 1 << 4,
 * } as const;
 *
 * const scope = PERMISSIONS.USER_CREATE | PERMISSIONS.USER_LIST;
 *
 * // { USER_CREATE: true, USER_UPDATE: false, USER_DELETE: false, USER_LIST: true }
 * const flags = flagsToMap(scope, PERMISSIONS);
 */
export function flagsToMap(
  value: number,
  bitmaskMap: Record<string, number>,
): Record<string, boolean>;

export function flagsToMap(
  value: bigint,
  bitmaskMap: Record<string, bigint>,
): Record<string, boolean>;

/**
 * Converts bitmask into mapped object with true/false values
 *
 * @group Object
 */
export function flagsToMap(
  value: number | bigint,
  bitmaskMap: Record<string, number | bigint>,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};

  const compare = typeof value === 'bigint' ? 0n : 0;

  for (const [key, mask] of Object.entries(bitmaskMap)) {
    result[key] = ((value as number) & (mask as number)) !== compare;
  }

  return result;
}
