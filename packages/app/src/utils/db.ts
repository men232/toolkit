import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DB_PATH = path.join(os.homedir(), '.cache', 'app-cli', 'state.json');

let data: Record<string, string> | null = null;

function load(): Record<string, string> {
  if (!data) {
    try {
      data = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
    } catch {
      data = {};
    }
  }
  return data!;
}

export const db = {
  get: (key: string): string | undefined => load()[key],
  set: (key: string, value: string): void => {
    load()[key] = value;
  },
  save: (): void => {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(load(), null, 2));
  },
};
