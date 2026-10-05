import { describe, expect, test } from 'vitest';
import { getFileExtension } from './getFileExtension';

describe('getFileExtension', () => {
  test('should handle full name', () => {
    expect(getFileExtension('Linkin Park - Faint.mp3')).toBe('.mp3');
  });

  test('should handle urls', () => {
    expect(
      getFileExtension(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
      ),
    ).toBe('.mp3');
  });

  test('should handle full name (without dot)', () => {
    expect(getFileExtension('Linkin Park - Faint.mp3', false)).toBe('mp3');
  });

  test('should handle urls (without dot)', () => {
    expect(
      getFileExtension(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
        false,
      ),
    ).toBe('mp3');
  });

  test('should return null when there is no extension', () => {
    expect(getFileExtension('file')).toBe(null);
    expect(getFileExtension('file.')).toBe(null);
    expect(getFileExtension('.gitignore')).toBe(null);
  });

  test('should ignore dots in directory names', () => {
    expect(getFileExtension('packages/my.lib/index')).toBe(null);
    expect(getFileExtension('packages/my.lib/index.ts')).toBe('.ts');
    expect(getFileExtension('C:\\dir.v2\\readme')).toBe(null);
  });

  test('should take the last extension', () => {
    expect(getFileExtension('archive.tar.gz')).toBe('.gz');
    expect(getFileExtension('.eslintrc.json')).toBe('.json');
  });

  test('should ignore dots in the query string', () => {
    expect(getFileExtension('https://x.com/a.mp3?v=1.2')).toBe('.mp3');
  });
});
