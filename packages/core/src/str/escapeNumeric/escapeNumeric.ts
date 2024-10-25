/**
 * Sanitize a string to remove non numeric chars
 *
 * @group Strings
 */
export function escapeNumeric(str: string) {
  const result = String(str).replace(/\D/g, '');

  if (!result.length) {
    return undefined;
  }

  return result;
}
