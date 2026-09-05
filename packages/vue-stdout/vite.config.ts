import { type Plugin, type PluginOption, defineConfig } from 'vite';
import vue from 'unplugin-vue/vite';
import vueJsx from 'unplugin-vue-jsx/vite';
import { compilerOptions } from './src/sfc/compiler-options.ts';

/**
 * Forces a plugin to `enforce: 'pre'`.
 *
 * `unplugin-vue-jsx` declares no `enforce`, so it lands in Vite's *normal*
 * bucket — and `resolvePlugins()` places the built-in transform
 * (`vite:oxc` in Vite 8, `vite:esbuild` before it) **ahead** of
 * `...normalPlugins`. The built-in transform's default `include` is
 * `/\.(m?ts|[jt]sx)$/`, so it claimed every `.tsx` first and compiled the JSX
 * itself, driven by `tsconfig.json`'s `"jsx": "react-jsx"` +
 * `"jsxImportSource": "vue"`. That emits `vue/jsx-runtime` calls, which pass
 * children as a **`children` prop value**; Vue's `createVNode` then sees a
 * non-function default slot and warns once per component with children. By the
 * time `unplugin-vue-jsx` ran there was no JSX left for it to transform, so it
 * silently re-printed the module and `@vue/babel-plugin-jsx` never fired.
 *
 * The build path never had this problem: `build.config.ts` hands the plugin to
 * rolldown directly, where it is the only JSX transform in the graph. So dev
 * and test compiled JSX with different semantics from what the package ships —
 * a green suite that proved nothing about JSX. See
 * `.agents/docs/gotchas.md#dev-and-build-compiled-jsx-with-different-semantics`.
 *
 * `'pre'` is the correct lever rather than disabling the built-in transform,
 * because `unplugin-vue-jsx` runs babel with `@babel/plugin-syntax-typescript`
 * — a **syntax-only** plugin. It parses TypeScript but does not strip it, so
 * its output still carries type annotations and *requires* the built-in
 * transform to run afterwards. Excluding `.tsx` from `oxc` would leave TS
 * syntax in the module the runtime evaluates.
 *
 * This mirrors `@vitejs/plugin-vue-jsx`, which sets `transform.order: 'pre'`
 * in exactly the case where it uses the same syntax-only TS plugin
 * (`tsTransform: 'built-in'`). Note also that `esbuild: false` is **not** a
 * lever on Vite 8: `resolveConfig()` logs "`esbuild: false` does not have
 * effect any more" and points at `oxc: false`, which would disable TS
 * stripping for the whole graph.
 */
function enforcePre(plugin: Plugin | Plugin[]): Plugin[] {
  return (Array.isArray(plugin) ? plugin : [plugin]).map(one => ({
    ...one,
    enforce: 'pre',
  }));
}

/**
 * The plugin set this package builds and runs its own code with, shared by
 * this config, `playground/vite.config.ts` (`pnpm dev`) and `vitest.config.ts`.
 *
 * Kept in one place deliberately: the playground and the test suite must
 * compile `.vue` and `.tsx` identically, or the harness meant to catch
 * renderer bugs by hand would be exercising a different pipeline from the one
 * the tests exercise.
 *
 * `isCustomElement` lives here, in this package's own config, and is not
 * exported — the same arrangement vue-tui uses for its `HOST_TAGS`. It is
 * needed because *this package's own* sources name the private host tags:
 * `NewLine.tsx` emits `<stdout-text>`, several `.tsx` tests write the tags
 * directly, and `test/fixtures/Simple.vue` names them in a template on purpose.
 * (`Box.tsx` and `Text.tsx` used to as well; they call `h()` now, to keep Vue
 * from wrapping their slot children in a Fragment -- see `Box.tsx`.) A consumer
 * needs none of it; they author with `<Box>` and `<Text>`, which resolve as
 * ordinary components. `examples/cli-vite/vite.config.ts` is the demonstration
 * — it configures `isCustomElement` nowhere, and it deliberately stays on the
 * stock `@vitejs` plugins to prove a consumer is not tied to the choice made
 * here.
 *
 * **Why `unplugin-*` and not `@vitejs/plugin-vue{,-jsx}`.** This renderer
 * mounts with `createApp().mount()` and has no server renderer, so a plugin
 * that emits SSR-flavoured code throws the moment a component mounts — and
 * vitest with `environment: 'node'` drives Vite's SSR transform. The `@vitejs`
 * plugins take the `ssr` flag from their host per call and offer no option to
 * override it, which is why this package used to ship two wrappers that
 * monkey-patched their hooks. `unplugin-vue` exposes the choice as a real
 * option that defaults to client output, and `unplugin-vue-jsx` has no SSR or
 * HMR code path at all, so both are simply configured rather than patched.
 * See `.agents/docs/gotchas.md`.
 */
export function stdoutPlugins(): PluginOption[] {
  return [
    // `ssr: false` is `unplugin-vue`'s own default; it is passed explicitly
    // because it is the entire reason this plugin is here, and a silent
    // upstream flip would surface as `useSSRContext()` throwing on mount.
    vue({ ssr: false, template: { compilerOptions } }),
    // `include` is pinned to JSX only. `unplugin-vue-jsx` defaults it to
    // `/\.[jt]sx?$/` — note the optional `s` — which puts every `.ts` and
    // `.js` file in the graph through `@babel/core` for a transform that can
    // only ever apply to JSX. `@vitejs/plugin-vue-jsx` defaults to
    // `/\.[jt]sx$/`, and that is the scope actually wanted here. Keeping the
    // wide default made babel re-print modules it has no business rewriting,
    // which surfaced as a `@babel/generator` warning about import attributes
    // during `pnpm dev`. Narrowing it is provably output-neutral: with the
    // same pin in `build.config.ts` the emitted `dist/**` code and `.d.mts`
    // are byte-identical and only the source maps shrink.
    //
    // `version: 3` is required by the option type; `build.config.ts` passes
    // the same pair.
    //
    // `enforce: 'pre'` is not cosmetic ordering — without it Vite's built-in
    // transform compiles the JSX first and this plugin becomes a no-op, so
    // `pnpm dev` and `pnpm test` ran different JSX semantics from `pnpm
    // build`. See `enforcePre` above for the full argument; the playground
    // inherits the fix because its config spreads this same plugin set.
    ...enforcePre(
      vueJsx({ ...compilerOptions, version: 3, include: /\.[jt]sx$/ }),
    ),
  ];
}

// The package-root config. `stdoutPlugins()` above is what the rest of the
// package actually consumes -- `vitest.config.ts` and `playground/vite.config.ts`
// both import it and build their own config around it -- so this default export
// is only what a bare `vite` at the package root would pick up.
export default defineConfig({
  plugins: stdoutPlugins(),
  // This package's code runs in Node, not a browser: there is nothing to
  // prebundle for, and letting the dep optimizer discover `vue` makes it hand
  // back a `.vite/deps/vue.js` path a module runner cannot resolve. vitest and
  // the playground config disable the optimizer the same way for the same
  // reason; neither reads this object, only `stdoutPlugins()`.
  optimizeDeps: { noDiscovery: true, include: [] },
});
