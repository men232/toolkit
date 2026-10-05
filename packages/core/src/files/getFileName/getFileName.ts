import { isString } from '@/is';
import { hasProtocol } from '@/str/hasProtocol';
import { getFileExtension } from '../getFileExtension';

/**
 * Extract filename from string
 *
 * @example
 * getFileName('Andrew L - CV.pdf'); // 'Andrew L - CV'
 *
 * @group Files
 */
export function getFileName(value: string): string | null {
  if (hasProtocol(value)) {
    return getFileName(decodeURI(value.split('/').at(-1)?.split('?')?.at(0)!));
  }

  if (!isString(value)) return null;

  const base = value.slice(
    Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\')) + 1,
  );
  const ext = getFileExtension(base, true);

  if (!ext) {
    return base;
  }

  return base.slice(0, -ext.length);
}
