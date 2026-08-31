/**
 * A Vite dev server for a terminal app: hot template updates, and a reload
 * that releases the terminal cleanly instead of restarting the process.
 *
 * ```ts
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import vue from 'unplugin-vue/vite';
 * import { vueStdoutDev } from '@andrew_l/vue-stdout/dev';
 *
 * export default defineConfig({
 *   plugins: [vue({ ssr: false }), vueStdoutDev({ entry: 'src/main.ts' })],
 * });
 * ```
 *
 * The app runs in the dev server's **own Node process**, inside Vite's runnable
 * `ssr` environment. Not in a child process, deliberately: two TTY-aware
 * processes writing one terminal interleave their raw-mode and alternate-screen
 * changes, and neither one's screen is what it computed.
 *
 * What that buys, and what it does not:
 *
 *  - editing an SFC **template** re-renders in place, keeping component state --
 *    a counter keeps counting;
 *  - editing an SFC **script** recreates the component, per Vue's own rules;
 *  - editing anything with no accepting importer releases the terminal and
 *    mounts a fresh app;
 *  - `.tsx` has no hot update path at all -- `unplugin-vue-jsx` emits none --
 *    so every JSX edit is a full reload. That is a deliberate scope choice, not
 *    an oversight; see `.agents/docs/technology-stack.md`.
 *
 * There is **no error overlay** in this phase: a compile failure lands as
 * Vite's own error output, which is ugly and honest.
 *
 * `vite` is an optional peer dependency. Importing this entry without it
 * installed will fail, which is the correct failure -- there is nothing here
 * that works without a dev server.
 */
import { randomUUID } from 'node:crypto';
import type { Plugin } from 'vite';
import { devPlugin } from './dev.ts';
import { devVmodPlugin } from './dev-vmod.ts';

export interface VueStdoutDevOptions {
  /** The module to run, relative to the Vite root (`src/main.ts`) or absolute. */
  entry: string;
}

export function vueStdoutDev(options: VueStdoutDevOptions): Plugin[] {
  // One id, minted here and shared by both plugins. It is what lets a full
  // reload reconnect the *same* session with a fresh hot context while a
  // genuinely second dev server in the same process is rejected.
  const session = { sessionId: randomUUID() };

  return [devPlugin({ session, entry: options.entry }), devVmodPlugin(session)];
}

export type { DevPluginOptions } from './dev.ts';
