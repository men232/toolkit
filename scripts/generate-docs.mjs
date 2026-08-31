import { execSync } from 'node:child_process';
import fs from 'node:fs';
import { glob, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const REPO_BRANCH = 'main';

// Repo-relative links (`./playground/...`, `./examples/...`) are correct on
// GitHub and npm, but nothing under them is published as a docs page -- inside
// `docs/reference` vitepress resolves them as routes and fails the build with
// "Found dead link". Point them back at the repository instead.
const RELATIVE_LINK_RE = /(\]\()(\.{1,2}\/[^)\s]+)/g;

const BLOCK_SEP = '```';
const installExample = packageName =>
  `
## 🔧 Installation

::: code-group

${BLOCK_SEP}sh [npm]
$ npm add -D ${packageName}
${BLOCK_SEP}

${BLOCK_SEP}sh [pnpm]
$ pnpm add -D ${packageName}
${BLOCK_SEP}

${BLOCK_SEP}sh [yarn]
$ yarn add -D ${packageName}
${BLOCK_SEP}
:::`.trim();

function repositoryUrl(pkg) {
  const url = pkg.packageJson.repository?.url;

  if (!url) return '';

  return url.replace(/^git\+/, '').replace(/\.git$/, '');
}

function linkToRepository(markdown, pkg) {
  const repository = repositoryUrl(pkg);

  if (!repository) return markdown;

  return markdown.replace(RELATIVE_LINK_RE, (match, open, link) => {
    const [target, hash] = link.split('#');
    const absolute = path.resolve(pkg.path, target);

    if (!fs.existsSync(absolute)) {
      console.warn(`${pkg.name}: README links to a missing path -- ${link}`);
      return match;
    }

    const kind = fs.statSync(absolute).isDirectory() ? 'tree' : 'blob';
    const repoPath = path
      .relative(REPO_ROOT, absolute)
      .split(path.sep)
      .join('/');

    return `${open}${repository}/${kind}/${REPO_BRANCH}/${repoPath}${hash ? `#${hash}` : ''}`;
  });
}

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
    const readme = fs.existsSync(readmeFile)
      ? await readFile(readmeFile, { encoding: 'utf-8' })
      : '';

    const content = linkToRepository(
      readme.replace('<!-- install placeholder -->', installExample(pkg.name)),
      pkg,
    );

    await writeFile(pkgIndexFile, content, { encoding: 'utf-8' });
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
