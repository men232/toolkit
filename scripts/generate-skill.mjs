import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { packagesManager } from './shared/PackageManager.mjs';

/**
 * Generates `skills/andrew-toolkit/SKILL.md`: an agent-facing index of every
 * public export of every package, installed with `npx skills add men232/toolkit`.
 *
 * Source of truth is the typedoc reflection JSON, so the index follows the
 * JSDoc `@group` tags and summaries without a second copy of either.
 */

const REPO_ROOT = path.resolve(import.meta.dirname, '..');
const CORE_NAME = '@andrew_l/toolkit';
const EXCLUDED = new Set([
  '@andrew_l/vue-stdout',
  '@andrew_l/ioc',
  '@andrew_l/pino-pretty',
]);
const OUT_FILE = path.join(REPO_ROOT, 'skills/andrew-toolkit/SKILL.md');

// typedoc ReflectionKind values
const KIND = {
  Namespace: 4,
  Class: 128,
  Function: 64,
  Variable: 32,
};

// Generic groups typedoc adds for untagged exports; the named `@group`
// titles (Array, Promise, ...) carry the index, these only fill the gaps.
const GENERIC_GROUPS = new Set([
  'Namespaces',
  'Classes',
  'Interfaces',
  'Type Aliases',
  'Variables',
  'Functions',
  'References',
  'Enumerations',
  'Constants',
]);

const FRONTMATTER = `---
name: andrew-toolkit
description: Index of the @andrew_l packages installed in this project. Check it before writing a helper to dedupe, group, chunk or sort an array; pick, omit, clone or deep-merge an object; debounce, throttle, retry, sleep or limit concurrency; format bytes, durations or dates; parse env vars; narrow or assert a value's type; hash or encode binary data; and before implementing graceful shutdown, side effects or hooks in a MongoDB transaction, cursor pagination, a request context, a query language parser or binary serialization.
---`;

const INTRO = `# @andrew_l packages

One section per npm package. Prefer these over a hand-written equivalent: they are tested and handle the edge cases (\`null\`, empty input, retries).

Full reference: https://men232.github.io/toolkit/reference/
`;

function runTypedoc() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-typedoc-'));
  const jsonFile = path.join(tmp, 'typedoc.json');

  const typedoc = path.join(REPO_ROOT, 'node_modules/.bin/typedoc');

  execSync(
    `"${typedoc}" --options typedoc.json --json "${jsonFile}" --out "${tmp}/out" --cleanOutputDir false --logLevel Error`,
    { cwd: REPO_ROOT, stdio: 'pipe' },
  );

  const json = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
  fs.rmSync(tmp, { recursive: true, force: true });

  return json;
}

/** First sentence of a typedoc comment summary, on one line. */
function summaryOf(reflection) {
  // Overloads carry the comment on whichever signature was documented.
  const comment =
    reflection.comment ??
    (reflection.signatures ?? []).find(s => s.comment)?.comment ??
    null;

  if (!comment) return '';

  const text = comment.summary
    .filter(part => part.kind === 'text' || part.kind === 'code')
    .map(part => part.text)
    .join('')
    .trim();

  const firstParagraph = text.split(/\n\s*\n/)[0].replace(/\s+/g, ' ');
  const firstSentence = firstParagraph.match(/^.*?[.!?](?=\s|$)/);

  return (firstSentence ? firstSentence[0] : firstParagraph).replace(
    /\|/g,
    '\\|',
  );
}

/** `name(a, b?, ...rest)` from the first signature. */
function signatureOf(reflection) {
  const signature = reflection.signatures?.[0];

  if (!signature) return reflection.name;

  const params = (signature.parameters ?? [])
    .map(p => {
      const name = p.name === '__namedParameters' ? 'options' : p.name;
      const optional = p.flags?.isOptional || p.defaultValue !== undefined;
      return `${p.flags?.isRest ? '...' : ''}${name}${optional ? '?' : ''}`;
    })
    .join(', ');

  return `${reflection.name}(${params})`;
}

function labelOf(reflection) {
  switch (reflection.kind) {
    case KIND.Function:
      return `\`${signatureOf(reflection)}\``;
    case KIND.Class:
      return `\`${reflection.name}\` (class)`;
    case KIND.Namespace:
      return `\`${reflection.name}.*\``;
    default:
      return `\`${reflection.name}\``;
  }
}

function isIndexed(reflection) {
  return (
    reflection.kind === KIND.Function ||
    reflection.kind === KIND.Class ||
    reflection.kind === KIND.Namespace ||
    reflection.kind === KIND.Variable
  );
}

function renderGroups(module, undocumented) {
  const byId = new Map(module.children.map(child => [child.id, child]));
  const sections = [];

  // Named groups first, in typedoc order; generic groups after.
  const groups = [...(module.groups ?? [])].sort(
    (a, b) => GENERIC_GROUPS.has(a.title) - GENERIC_GROUPS.has(b.title),
  );

  for (const group of groups) {
    const generic = GENERIC_GROUPS.has(group.title);
    const rows = group.children
      .map(id => byId.get(id))
      .filter(child => child && isIndexed(child))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(child => [child, summaryOf(child)])
      .filter(([child, summary]) => {
        if (summary) return true;
        undocumented.push(`${module.name} ${group.title}: ${child.name}`);
        // An untagged export without JSDoc is not meant to be found.
        return !generic;
      })
      .map(([child, summary]) => `| ${labelOf(child)} | ${summary} |`);

    if (rows.length === 0) continue;

    const title = generic ? `Other ${group.title.toLowerCase()}` : group.title;

    sections.push(
      `### ${title}\n\n| Export | Does |\n| --- | --- |\n${rows.join('\n')}`,
    );
  }

  return sections;
}

function renderPackage(module, pkg, undocumented) {
  const name = pkg.getNpmName();
  const description = pkg.packageJson.description ?? '';
  const groups = renderGroups(module, undocumented);

  return [`## ${name}`, description, `\`pnpm add ${name}\``, ...groups].join(
    '\n\n',
  );
}

function renderContents(packages) {
  const rows = packages.map(
    ({ pkg }) =>
      `| [\`${pkg.getNpmName()}\`](#${pkg.getNpmName().replace(/[@/]/g, '')}) | ${pkg.packageJson.description ?? ''} |`,
  );

  return `## Packages\n\n| Package | Does |\n| --- | --- |\n${rows.join('\n')}`;
}

function main() {
  const root = runTypedoc();
  const undocumented = [];

  // Core first: it is the dependency of every other package.
  const packages = packagesManager
    .getPackages()
    .filter(pkg => !pkg.isPrivate() && !EXCLUDED.has(pkg.getNpmName()))
    .map(pkg => ({
      pkg,
      module: root.children.find(child => child.name === pkg.getNpmName()),
    }))
    .filter(({ module }) => module)
    .sort((a, b) => {
      if (a.pkg.getNpmName() === CORE_NAME) return -1;
      if (b.pkg.getNpmName() === CORE_NAME) return 1;
      return a.pkg.getNpmName().localeCompare(b.pkg.getNpmName());
    });

  const content = [
    FRONTMATTER,
    INTRO,
    renderContents(packages),
    ...packages.map(({ module, pkg }) =>
      renderPackage(module, pkg, undocumented),
    ),
    '',
  ].join('\n\n');

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, content);

  if (undocumented.length) {
    console.warn(
      'Exports without a JSDoc summary (untagged ones are skipped):\n  %s',
      undocumented.join('\n  '),
    );
  }

  console.info(
    'SKILL.md: %d packages, %d lines, %d KB',
    packages.length,
    content.split('\n').length,
    Math.round(content.length / 1024),
  );
}

main();
