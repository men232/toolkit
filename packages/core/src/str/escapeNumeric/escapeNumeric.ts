/**
 * Sanitize a string to remove non numeric chars.
 *
 * @example
 * escapeNumeric('use 320px'); // '320'
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
