/**
 * Pick object keys with excluding prefix keys
 *
 * @group Object
 */
export function omitPrefixed(
  obj: Record<string, unknown>,
  prefix: string,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith(prefix)) continue;
    result[key] = value;
  }

  return result;
}
