import path from 'node:path';

export const isHelpArgument = (argv: string | string[]) => {
  if (!Array.isArray(argv)) {
    argv = [argv];
  }

  return argv.includes('--help') || argv.includes('-h');
};

export function isMainFile(filepath: string): boolean {
  const cwd = process.cwd();
  return process.argv.some(arg => filepath.endsWith(path.resolve(cwd, arg)));
}

export function extractOptionsArgs(argv: string[]): string[] {
  const result = [];
  let flag = false;

  for (const value of argv) {
    if (value.startsWith('--')) {
      flag = true;
      result.push(value);
      continue;
    }

    if (flag) {
      result.push(value);
      flag = false;
    }
  }

  return result;
}
