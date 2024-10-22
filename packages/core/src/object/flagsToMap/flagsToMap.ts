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
