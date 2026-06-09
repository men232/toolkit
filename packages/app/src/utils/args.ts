import os from 'node:os';
import path from 'node:path';

export const isHelpArgument = (argv: string | string[]) => {
  if (!Array.isArray(argv)) {
    argv = [argv];
  }

  return argv.includes('--help') || argv.includes('-h');
};

export const filterHelpArgument = (argv: string[]) => {
  return argv.filter(v => !isHelpArgument(v));
};

export const isDevArgument = (argv: string[]) => {
  return argv.includes('--dev');
};

export function pathLastParts(value: string, count: number): string {
  const parts = path.normalize(value).split(path.sep);
  return parts.slice(-count).join(path.sep);
}

export function getInstanceName(): string {
  return process.env.DYNO || process.env.NODE_INSTANCE || os.hostname();
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
