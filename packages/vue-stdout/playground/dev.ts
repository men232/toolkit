/**
 * `pnpm dev` — the playground launcher.
 *
 * There is one dev command, and it is the Vite dev server. What this file adds
 * in front of it is the command line, because under a dev server the command
 * line belongs to `vite`: the entry cannot read `pnpm dev counter` off `argv`,
 * since by the time it runs `argv` is the server's. So the argument is mapped
 * onto `VUE_STDOUT_DEMO` here, before the config that reads it is loaded.
 *
 * Three jobs, in this order:
 *
 *  1. `--list` is answered from `./catalog.ts` and exits. Deliberately no
 *     server: printing six names should not be able to fail for a dev server's
 *     reasons, and should not cost a dev server's startup.
 *  2. A positional argument is validated against the same catalog and becomes
 *     `VUE_STDOUT_DEMO`. Validating here means a typo costs an error line
 *     rather than a server that boots and then aborts inside the runner.
 *  3. Everything else is Vite's.
 *
 * The server is created in *this* process rather than by spawning the `vite`
 * binary. `@andrew_l/vue-stdout/dev` runs the app inside the dev server's own
 * process on purpose (see `.agents/docs/architecture.md`), and a child process
 * would put a second TTY-aware process on the same terminal for no gain —
 * `vite`'s own `serve` command is `createServer().listen()` plus `printUrls()`
 * and `bindCLIShortcuts()`, and this package's dev plugin already silences
 * both (`logLevel: 'error'`, and a no-op `bindCLIShortcuts`).
 *
 * Run by `tsx`, so relative specifiers carry their extension: tsx@4.22 stopped
 * guessing them, which is the same reason `src/sfc/register.ts` names
 * `./hook.ts`.
 */
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { catalog } from './catalog.ts';

const args = process.argv.slice(2);

if (args.includes('--list') || args.includes('-l')) {
  for (const demo of catalog) {
    process.stdout.write(`${demo.name.padEnd(10)} ${demo.blurb}\n`);
  }
  process.exit(0);
}

const requested = args.find(arg => !arg.startsWith('-'));

if (requested !== undefined) {
  if (!catalog.some(demo => demo.name === requested)) {
    process.stderr.write(
      `Unknown demo "${requested}". Known: ${catalog.map(demo => demo.name).join(', ')}\n`,
    );
    process.exit(1);
  }

  // Set before `createServer` loads the config, which is where the playground's
  // Vite config and then the entry read it.
  process.env.VUE_STDOUT_DEMO = requested;
}

createServer({
  configFile: fileURLToPath(new URL('./vite.config.ts', import.meta.url)),
})
  .then(server => server.listen())
  .catch((error: unknown) => {
    console.error('[vue-stdout] the playground dev server failed to start');
    console.error(error);
    process.exitCode = 1;
  });
