// `pnpm docs:generate` runs typedoc, which builds its program with plain `tsc`
// -- and `tsc` cannot resolve a `.vue` SFC. Since `src/index.ts` re-exports
// `./cli/index.js`, whose module graph reaches `tui/launchAppsTui.ts` ->
// `TuiRoot.vue`, every doc build failed with TS2307 on the TUI components even
// though `check-types` was clean: that script runs `vue-tsc`, which resolves
// SFCs for real. This ambient wildcard only gives the plain-`tsc` program
// something to resolve; real-file resolution wins in vue-tsc, so the types the
// components are actually checked against are unchanged.
declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent;

  export default component;
}
