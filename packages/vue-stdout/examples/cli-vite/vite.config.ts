import { builtinModules } from 'node:module';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { defineConfig } from 'vite';
// The `with { type: 'json' }` attribute is what vite 8's native config loader
// needs to read this file: without it the loader falls back and warns, and it
// is slated to become the only supported form.
import pkg from './package.json' with { type: 'json' };

export default defineConfig({
  // Stock Vue plugins, configured with nothing. That is the point of this
  // file: `@andrew_l/vue-stdout`'s host tags are private, so there is no
  // `isCustomElement` to pass and no preset to spread — a vue-stdout app is
  // built like any other Vue app. `src/cli.tsx` and `src/Stats.vue` author
  // with `<Box>` / `<Text>`, which are ordinary components, and the built
  // `dist/cli.mjs` contains no `resolveComponent` call at all.
  //
  // A plain client `vite build` also never drives Vite's SSR transform, so
  // the plugins' stock output is already client-flavoured. Hosts that *do*
  // drive it (vitest, `vite build --ssr`) need a deliberate choice — see this
  // example's README.
  //
  // These are the `@vitejs` plugins on purpose, even though `@andrew_l/vue-stdout`
  // itself now compiles with `unplugin-vue`/`unplugin-vue-jsx`: an example is
  // documentation, and what this one documents is that a consumer inherits
  // none of the renderer's compiler choices. It doubles as the check that the
  // shipped `dist/` never grows a dependency on that family.
  plugins: [vue(), vueJsx()],

  build: {
    // Matches `@andrew_l/vue-stdout`'s own `engines.node` (>=22.12.0): the
    // `slice-ansi@9`/`cli-truncate@6` dependencies set the major, and the
    // vite 8 / plugin-vue 6 / plugin-vue-jsx 5 line (`^20.19.0 || >=22.12.0`)
    // sets the minor. Targeting anything lower would emit a bundle for a
    // runtime that cannot load the package it imports.
    target: 'node22.12',
    outDir: 'dist',
    lib: {
      entry: 'src/cli.tsx',
      formats: ['es'],
      fileName: () => 'cli.mjs',
    },
    rollupOptions: {
      // A CLI resolves its dependencies at runtime from node_modules; only
      // this package's own sources belong in the bundle.
      external: [
        ...builtinModules,
        ...builtinModules.map(name => `node:${name}`),
        ...Object.keys(pkg.dependencies),
      ],
      output: {
        banner: '#!/usr/bin/env node',
      },
    },
  },
});
