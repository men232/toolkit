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
  const ext = getFileExtension(value, true);

  if (!ext) {
    return value;
  }

  return value.slice(0, -ext.length);
}
