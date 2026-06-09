import path from 'node:path';

export function isMainFile(filepath: string): boolean {
  const cwd = process.cwd();
  return process.argv.some(arg => filepath.endsWith(path.resolve(cwd, arg)));
}
