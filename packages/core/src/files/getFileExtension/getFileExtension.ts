/**
 * Extract file extension from string
 *
 * @example
 * getFileExtension('Andrew L - CV.pdf'); // 'pdf'
 *
 * @group Files
 */
export function getFileExtension(name: string): string | null {
  if (typeof name !== 'string') {
    return null;
  }

  const ext = name.split('.').at(-1)?.split('?')?.at(0);
  return ext ? `.${ext}` : null;
}
