import { defineBuildConfig } from 'obuild/config';
import VueJSX from 'unplugin-vue-jsx/rollup';
import { isCustomElement } from './src/sfc/compiler-options';

export default defineBuildConfig({
  entries: [
    {
      // `sfc/hook` is an entry even though it is absent from `exports`:
      // `sfc/register` loads it by URL (`new URL('./hook.mjs', ...)`), so it
      // must land at a stable path rather than inside a hashed chunk.
      input: [
        './src/index.ts',
        './src/sfc/register.ts',
        './src/sfc/hook.ts',
        // The `./dev` entry: the Vite dev server plugin. Its own entry rather
        // than part of `index` because it imports `vite`, an optional peer,
        // and nothing that only renders should pull that in.
        './src/vite/index.ts',
      ],
      type: 'bundle',
      outDir: './dist',
      rolldown: {
        // `isCustomElement` so the private host tags `<stdout-box>` and
        // `<stdout-text>` (as emitted by `NewLine.tsx`)
        // compile as elements, not `resolveComponent()` calls, in the shipped
        // output — same reasoning as `vitest.config.ts`. This is the reason
        // the tag set can be private at all: the JSX transform that needs it
        // runs here, when the package is built, so a consumer's own build
        // never meets a host tag. The `/rollup` build of the plugin is used
        // because rolldown consumes Rollup plugins directly, and
        // unplugin-vue-jsx has no rolldown entry of its own.
        //
        // `include` matches `vite.config.ts`, and for the same reason: the
        // plugin's default is `/\.[jt]sx?$/`, which would put every `.ts`
        // module through `@babel/core` for a JSX-only transform. Measured
        // output-neutral — `dist/**` code and `.d.mts` are byte-identical
        // either way, and the maps agree at 15107 of 15147 sampled positions
        // (the rest differ by one column on one line) while shrinking 32 kB.
        plugins: [VueJSX({ isCustomElement, version: 3, include: /\.[jt]sx$/ })],
      },
      dts: {
        build: true,
        sourcemap: true,
      },
    },
  ],
});
