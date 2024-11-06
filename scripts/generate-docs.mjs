import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { glob, readFile } from 'node:fs/promises';
import path from 'node:path';

async function getPackages() {
  const result = [];

  for await (const file of glob('./packages/*/package.json')) {
    const pkg = {
      name: '',
      path: path.resolve(import.meta.dirname, '../', path.dirname(file)),
      packageJson: {},
    };

    pkg.packageJson = JSON.parse(await readFile(file));
    pkg.name = pkg.packageJson.name;

    result.push(pkg);
  }

  return result;
}

async function main() {
  execSync('typedoc --options typedoc.json', { stdio: 'pipe' });

  const packages = await getPackages();
  const docsRoot = path.resolve(import.meta.dirname, '../docs/reference');

  // replace index.md with readme.md
  for (const pkg of packages) {
    const readmeFile = path.resolve(pkg.path, 'README.md');
    const pkgIndexFile = path.join(docsRoot, pkg.name, 'index.md');

    if (fs.existsSync(readmeFile)) {
      fs.copyFileSync(readmeFile, pkgIndexFile);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
