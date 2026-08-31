# Intent

`@andrew_l/vue-stdout` is a custom Vue 3 renderer that paints a component tree
into a terminal: flexbox layout via Yoga, ANSI styling, and a small component
catalog (`Box`, `Text`, `ProgressBar`, `Spacer`, `Static`, `Transform`,
`NewLine`, `ErrorBoundary`).

It is one package inside the `men232/toolkit` monorepo, published to npm
alongside fifteen-odd unrelated siblings. It is not the repository's centre of
gravity and does not set repository-wide policy.

## What it is trying to be

**A Vue-native port of ink's model.** ink is the reference implementation of
component-driven terminal UI, and this package deliberately reproduces its
engine — the same Yoga layout, the same paint pipeline, the same erase-and-
rewrite frame protocol, the same throttling defaults, the same composable
catalog under Vue names (`useInput`, `useFocus`, `useFocusManager`, `usePaste`,
`useCursor`, `useApp`, `useStdin`/`useStdout`/`useStderr`, `useWindowSize`).
Byte-level output parity with ink is a maintained, tested property, not an
aspiration — see [ink reference](./ink-reference.md).

**Vue-shaped at the surface.** Reproducing ink's *behaviour* does not mean
reproducing React's *idioms*. Options that vary are `MaybeRefOrGetter`;
composables return `Ref`s that consumers can feed straight into other
composables (`useInput(handler, { isActive: isFocused })`); derived values are
`computed` over shared reactive data rather than hand-mirrored per consumer.
Where ink's shape and Vue's shape disagree, Vue wins at the API and ink wins at
the pixels.

The entry point is the clearest case of that rule. ink starts an app with
`render(<App/>)` and hands back an `Instance`; this package started the same
way, and the cost was that a consumer could never reach `app.use()`, a global
component, an app-level `provide()` or `app.config.errorHandler` — Vue's whole
application surface was behind a door `render()` did not open. `createApp(App)`
now returns Vue's own app object with `mount()` pointed at a terminal, and
`render()` is gone rather than kept as an alias: a package that means to be a
Vue library should not ship a transliterated React entry point beside the Vue
one. `rerender()` went with it (in Vue you change data, or mount again), and
`clear()` moved onto `useStdout()`, where the live terminal it needs actually
exists. See
[architecture](./architecture.md#the-entry-point-createapp--mount).

**Usable three ways.** `createApp().mount()` for a live app,
`renderToString()` for a synchronous frame with no terminal ownership at all,
and `measureElement()` for imperative geometry. The three consume the same engine; `renderToString()`
existing synchronously is a hard constraint on the layout and paint path.

**Reachable without a build step, for `.vue`.** `@andrew_l/vue-stdout/register`
is a Node ESM loader hook that compiles single-file components in-process, so a
CLI can be `node --import tsx --import @andrew_l/vue-stdout/register src/main.ts`
with no bundler. The bundled path needs nothing from this package at all —
stock Vue plugins, no options, no preset; `examples/cli-vite` is the whole of
it.

## The authoring surface

**SFC is the foundation; TSX/JSX is a supplementary feature.** The owner's
words, 2026-08-30. Both are supported and both stay supported — this is a
statement about emphasis, not about deprecation.

What follows from it:

- **`.vue` is what the package's own surfaces show first.** The README's
  primary usage example is a single-file component and the JSX spelling of the
  same component is kept beside it, marked as the supplementary path. Five of
  the six playground demos are SFCs; `layout` stays `.tsx` deliberately, so the
  JSX path keeps being compiled, type-checked and mounted by
  `test/playground.test.ts` on every run rather than only described in prose.
  A demo is the cheapest place to notice that the supplementary path broke.
- **The no-build path is the concrete reason for the ordering.** `/register`
  compiles `.vue` and nothing else. A `.tsx` CLI needs a bundler running
  `@vue/babel-plugin-jsx` — see
  [gotchas](./gotchas.md#plain-tsx-does-not-give-you-working-vue-jsx). So `.vue`
  is the surface with the shorter path to a running program, and that is what
  "foundation" buys the consumer.
- **A template-only defect is a real defect.** The two authoring surfaces do
  not compile to the same thing, and the gaps favour JSX by default: boolean
  props and whitespace both behave differently from a `<template>`
  ([gotchas](./gotchas.md#the-bare-boolean-attribute--fixed-but-it-needs-feeding)).
  Neither is fixed by writing the demo in JSX instead.
- **What this is not.** It is not a reason to remove JSX support, to stop
  type-checking `.tsx`, to drop `unplugin-vue-jsx` from the compile paths, or
  to change the component catalog. The components are the authoring surface
  under both.

## Who it is for

A Node CLI author who already knows Vue and wants a dashboard, a progress
display, an interactive prompt, or a long-lived TUI without learning a second
component model. The README's framing — "CLI applications, interactive tools,
and dashboards" — is the honest scope.

## Non-goals

- **Not a general terminal-application framework.** There is no router, no
  state-management story, no plugin system, no theming layer. The package ships
  a renderer, a component catalog, and composables; application architecture is
  the consumer's.
- **No server rendering.** The renderer mounts with `createApp().mount()` and
  has no server renderer at all. SSR-flavoured codegen from a Vue Vite plugin
  throws the moment a component mounts, which is why the SFC/Vite pipeline
  spends real effort forcing client-flavoured output (see
  [architecture](./architecture.md#the-sfc-and-vite-pipeline)).
- **No compiler of its own, for `.vue` or `.tsx`.** Bring your own: the
  consumer writes `plugins: [vue(), vueJsx()]` with no options. The package has
  nothing to configure because its host tags are private and the authoring
  surface is ordinary Vue components. There was a `vueStdout()` preset and an
  exported `isCustomElement` until the tags went private; both are gone, and
  the two client-transform wrappers that remain are escape hatches for hosts
  that drive the SSR transform, not a pipeline.

- **Host tags are not public API.** `stdout-box` and `stdout-text` are the
  renderer's internal element names, on the same footing as ink's `ink-box` /
  `ink-text` and vue-tui's `tui-box` / `tui-text`. Publishing them was the
  outlier position and it cost twice: three of the five old tags (`span`, `b`,
  `a`) were real HTML tags, so typing them meant a global module augmentation
  that replaced native typing in a consumer's whole program; and publishing
  them at all was what forced every consumer to configure `isCustomElement`.
- **No accessibility or screen-reader surface.** Nothing in the component
  catalog carries semantic or assistive-technology meaning.
- **Not a divergence catalogue.** Differences from ink are recorded where the
  behaviour is decided, with a measurement, and only when a measurement exists.
  Similarity is not itself a goal — but a difference nobody chose is a bug.

## What "done" looks like for a change

A change is finished when the behaviour it claims is pinned by a test that was
observed to fail first, `pnpm test` is back at its green baseline, and
`check-types` and `build` exit 0. If the change touches output, the parity suite
is the arbiter — it renders both engines and compares, so it cannot be satisfied
by a transcribed expectation going stale.
