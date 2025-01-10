import { isString } from '@/is';

/**
 * Extract file extension from string
 *
 * @example
 * getFileExtension('Andrew L - CV.pdf'); // 'pdf'
 *
 * @group Files
 */
export function getFileExtension(name: string, withDot = true): string | null {
  if (!isString(name)) {
    return null;
  }

  const ext = name.split('.').at(-1)?.split('?')?.at(0);
  return ext ? (withDot ? `.${ext}` : ext) : null;
}
