import { getFileExtension } from '../getFileExtension';

export function getFileName(value: string): string | null {
  const ext = getFileExtension(value, true);

  if (!ext) {
    return value;
  }

  return value.slice(0, -ext.length);
}
