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

  const queryIndex = name.indexOf('?');
  const path = queryIndex === -1 ? name : name.slice(0, queryIndex);
  const baseIndex = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  const dotIndex = path.lastIndexOf('.');

  if (dotIndex <= baseIndex + 1 || dotIndex === path.length - 1) {
    return null;
  }

  const ext = path.slice(dotIndex + 1);

  return withDot ? `.${ext}` : ext;
}
