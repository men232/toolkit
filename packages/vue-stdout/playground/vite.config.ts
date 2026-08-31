import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { stdoutPlugins } from '../vite.config.ts';
import { vueStdoutDev } from '../src/vite/index.ts';

/**
 * The dev-server harness behind `pnpm dev`, loaded by `./dev.ts`.
 *
 * Separate from `../vite.config.ts` on purpose, and the separation is not
 * tidiness. That file is imported by `vitest.config.ts` for its plugin list,
 * and this plugin is `apply: 'serve'` -- vitest drives a dev server of its own,
 * so folding these plugins in there would launch the playground during
 * `pnpm test`.
 *
 * `root` is the package directory rather than this file's own, because the
 * playground imports the renderer from `../src`.
 *
 * Which demo to open is not decided here: it travels in `VUE_STDOUT_DEMO`,
 * which `./dev.ts` sets from `pnpm dev <name>` before this file is loaded, and
 * which is deliberately left unset for a bare `pnpm dev` so the menu opens.
 *
 * **Editing this file while the dev server is running is undefined behaviour.**
 * Vite restarts the server on a config change by building the replacement
 * before closing the original, so for that moment two dev sessions each hold a
 * mounted app that believes it owns the terminal -- raw mode, the alternate
 * screen and the cursor all get set twice and restored once. There is no
 * terminal-ownership registry yet. Stop the server, edit, start it again.
 */
export default defineConfig({
  root: fileURLToPath(new URL('..', import.meta.url)),
  plugins: [
    ...stdoutPlugins(),
    vueStdoutDev({ entry: 'playground/index.tsx' }),
  ],
  // Same reason as `../vite.config.ts`: the app runs in Node, so there is
  // nothing to prebundle, and letting the optimizer discover `vue` hands back
  // a `.vite/deps/vue.js` path the module runner cannot resolve.
  optimizeDeps: { noDiscovery: true, include: [] },
});
