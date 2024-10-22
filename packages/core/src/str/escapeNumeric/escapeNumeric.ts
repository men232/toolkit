export function escapeNumeric(str: string) {
  const result = String(str).replace(/\D/g, '');

  if (!result.length) {
    return undefined;
  }

  return result;
}
