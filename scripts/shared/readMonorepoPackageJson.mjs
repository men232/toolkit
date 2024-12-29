import fs from 'fs-extra';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export function readMonorepoPackageJson() {
  return fs.readJsonSync(path.resolve(__dirname, '../../package.json'));
}
