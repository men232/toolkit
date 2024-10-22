import { isString } from '@/is';

/**
 * Extracts file extension from filename or url link
 */
export function getFileExtension(name: string, withDot = true): string | null {
  if (!isString(name)) {
    return null;
  }

  const ext = name.split('.').at(-1)?.split('?')?.at(0);
  return ext ? (withDot ? ext : `.${ext}`) : null;
}
