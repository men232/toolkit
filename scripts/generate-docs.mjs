import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { glob, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BLOCK_SEP = '```';
const installExample = packageName => `::: code-group

${BLOCK_SEP}sh [npm]
$ npm add -D ${packageName}
${BLOCK_SEP}

${BLOCK_SEP}sh [pnpm]
$ pnpm add -D ${packageName}
${BLOCK_SEP}

${BLOCK_SEP}sh [yarn]
$ yarn add -D ${packageName}
${BLOCK_SEP}
:::`;

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
    const readme = fs.existsSync(readmeFile) ? await readFile(readmeFile) : '';

    const content = `
# Installation

${installExample(pkg.name)}


${readme}
`.trim();

    await writeFile(pkgIndexFile, content, { encoding: 'utf-8' });
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
