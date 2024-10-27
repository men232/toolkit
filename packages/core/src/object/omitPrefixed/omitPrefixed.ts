/**
 * Pick object keys with excluding prefix keys
 *
 * @example
 * const record = {
 *   id: 1,
 *   canRead: true,
 *   canWrite: true,
 * };
 *
 * omitPrefixed(record, 'can'); // { id: 1 }
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
