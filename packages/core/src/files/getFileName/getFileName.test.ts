import { describe, expect, test } from 'vitest';
import { getFileName } from './getFileName';

describe('getFileName', () => {
  test('from full name', () => {
    expect(getFileName('Linkin Park - Faint.mp3')).toBe('Linkin Park - Faint');
  });

  test('from url', () => {
    expect(
      getFileName(
        'https://zaycev.net/download/Linkin%20Park%20-%20Faint.mp3?dw=1',
      ),
    ).toBe('Linkin Park - Faint');
  });

  test('without extension', () => {
    expect(getFileName('file')).toBe('file');
    expect(getFileName('.gitignore')).toBe('.gitignore');
    expect(getFileName('packages/my.lib/index')).toBe('index');
  });

  test('from path', () => {
    expect(getFileName('packages/my.lib/index.ts')).toBe('index');
    expect(getFileName('/var/log/app.log')).toBe('app');
    expect(getFileName('C:\\Users\\andrew\\report.pdf')).toBe('report');
  });
});
