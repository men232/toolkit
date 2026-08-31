import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';
// Extension-bearing specifier and `import.meta.dirname` below: vite 8's native
// config loader warns on both, and `configLoader: 'native'` is slated to become
// the default. Same class as the extensionless dynamic import that Node's ESM
// loader rejected in `src/sfc/hook.ts`.
import { stdoutPlugins } from './vite.config.ts';

export default defineConfig({
  // `isCustomElement` so this package's own `<stdout-box>`/`<stdout-text>`
  // compile as elements instead of `resolveComponent()` calls (see
  // `NewLine.tsx`), and `unplugin-vue`'s client-output default so
  // `.vue` survives the SSR module transform vitest drives for
  // `environment: 'node'` — without it every SFC compiles to a render function
  // calling `useSSRContext()` and mounting throws. Shared with
  // `vite.config.ts` so `pnpm dev` and `pnpm test` compile the same sources
  // the same way; the choice of plugin family is argued there.
  plugins: stdoutPlugins(),
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    // Fails any test outright the instant it puts the real terminal into
    // raw mode -- see the file's own header comment for why this is a
    // tripwire rather than a documented convention.
    setupFiles: ['./test/setup/no-real-raw-mode.ts'],
    env: {
      // Both vue-stdout and ink colourise through their own copy of
      // chalk. Chalk resolves its colour level from environment
      // detection, so the two instances can disagree under a test
      // runner (one emitting ANSI codes, the other not) for reasons
      // unrelated to layout. Pin FORCE_COLOR so both instances resolve
      // to the same (truecolor) level, matching what ink's own test
      // suite does.
      FORCE_COLOR: '3',
      // The non-interactive detection (`resolveInteractive`, `src/createApp.ts`)
      // reads `is-in-ci` at import time, which is `true` the moment
      // `CI` is set to anything other than `'0'`/`'false'` -- true on every
      // CI runner (GitHub Actions sets `CI=true` by default), but not on a
      // laptop. Left alone, that flips every test in this suite that drives
      // `render()` without an explicit `interactive` override into
      // non-interactive mode the instant it runs in CI, even though its
      // fake `stdout` is a "TTY" (`isTTY: true`) -- exactly ink's own
      // precedence rule (CI beats a TTY), just not what any of those tests
      // are written to exercise. Pinning `CI`/`CONTINUOUS_INTEGRATION` to
      // `'false'` here -- the same string ink's own GitHub Actions workflow
      // uses for this exact purpose -- keeps the suite deterministic across
      // a laptop and a runner, same rationale as `FORCE_COLOR` above.
      // `test/non-interactive.test.ts` covers the CI-precedence rule itself
      // via `vi.doMock('is-in-ci', ...)`, independent of this pin.
      CI: 'false',
      CONTINUOUS_INTEGRATION: 'false',
    },
  },
});
