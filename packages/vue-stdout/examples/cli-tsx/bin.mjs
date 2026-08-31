#!/usr/bin/env node
// A published CLI cannot rely on its user passing `--import` flags, so the
// entry point re-executes itself once with the two loaders in place: `tsx`
// for TypeScript, then `@andrew_l/vue-stdout/register` for `.vue`. Order
// matters -- register must be chained *after* tsx, since the SFC hook hands
// its `<script lang="ts">` output back to the chain to be transpiled.
//
// `pnpm start` skips this and passes the flags directly; this file exists so
// `npx example-cli-tsx` works too.
import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const entry = fileURLToPath(new URL('./src/main.ts', import.meta.url));

const { status } = spawnSync(
  process.execPath,
  [
    '--import',
    'tsx',
    '--import',
    '@andrew_l/vue-stdout/register',
    entry,
    ...process.argv.slice(2),
  ],
  { stdio: 'inherit' },
);

process.exit(status ?? 1);
