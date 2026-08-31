# Gotchas

Traps already paid for. Each one cost a debugging session; none is hypothetical.

## `isCustomElement` must reach `parse()`, not just `templateOptions`

Scope note first: since the host tags went private this is an **internal**
trap, not a consumer-facing one. A consumer authors with `<Box>` / `<Text>`,
which are imported components, and configures no compiler options at all. The
paths below are this repo's own — `build.config.ts`, `vite.config.ts`,
`src/sfc/hook.ts` — because this package's own sources are what name the tags.

`<stdout-box>` and `<stdout-text>` are unknown to Vue. If they are not claimed
as custom elements, templates compile them into
`resolveComponent('stdout-box')`, which fails to resolve and **warns straight
into the user's rendered frame** — the one place a warning is guaranteed to
corrupt the output. The hyphen does not save you: `@vue/babel-plugin-jsx`
resolves a JSX tag by `isCustomElement` → `isHTMLTag` → `isSVGTag` →
`resolveComponent`, with no dash heuristic anywhere (read from
`@vue/babel-plugin-jsx@2.0.1`'s `dist/index.mjs`).

**A warning is the mild version of this.** `resolveComponent` matches the
*current component's own name* before it looks anywhere else, so a host tag
that camelizes to the name of the component emitting it resolves to that
component and recurses forever. That is what the old unprefixed `box` tag did
inside `Box`: `capitalize(camelize('box'))` is `'Box'`, which is
`Box.displayName`. The symptom is not a warning in the frame but
`RangeError: Maximum call stack size exceeded` on first render.

This is not hypothetical and it is not only a source-time concern — **it
shipped**. Published `@andrew_l/vue-stdout@0.4.6` throws exactly that from
`<Box>`, because its bundle was built without `isCustomElement` reaching the
JSX transform. Reproducible with `npm pack @andrew_l/vue-stdout@0.4.6`;
confirmed by re-rendering the published component with only `displayName`
changed, which renders correctly. Two things follow. The predicate has to
reach **`build.config.ts`**, not just the dev and test configs — a green suite
says nothing about what was compiled into `dist/`. And the current prefixes
are what defuse the recursion arm specifically: `capitalize(camelize(
'stdout-box'))` is `StdoutBox`, which is nobody's `displayName`, so a missing
predicate now degrades to the warning rather than the `RangeError`.

**The obvious test cannot see any of this.** A failed component lookup still
renders the tag as a plain element, so the frame is byte-identical either way
and any assertion on rendered output passes against the broken build. Only two
things discriminate: the compiled source (assert it contains no
`resolveComponent`) and stderr (assert the child process writes nothing).
`test/sfc-register.test.ts` does both.

The non-obvious part: since Vue 3.4 it is the **parser** that fixes each tag's
`tagType`, and `compileScript({ inlineTemplate: true })` reuses the AST the
parser already built. Passing `isCustomElement` only to `templateOptions` is too
late — `<stdout-box>` has already been classified a component by then. It must
go to `parse()` as `templateParseOptions` **as well**.

Where: [`src/sfc/hook.ts`](../../src/sfc/hook.ts) (commit `0146b9d`). Pinned by
[`test/sfc-register.test.ts`](../../test/sfc-register.test.ts), which asserts the
compiled source does **not** contain `resolveComponent`. Its fixture
[`test/fixtures/Simple.vue`](../../test/fixtures/Simple.vue) is deliberately the
one SFC in the repo still written against the host tags: a fixture naming only
components would satisfy that assertion for the wrong reason.

## The Vue plugins that needed patching, and the ones that do not

This package compiles its own `.vue` and `.tsx` with `unplugin-vue` and
`unplugin-vue-jsx` rather than the `@vitejs` pair. That is not a style
preference — it is the settlement of a trap that cost three reviews and a
major-version migration, and the reasoning is worth keeping even though the
code that embodied it is gone.

**The problem.** This renderer mounts with `createApp().mount()` and has no
server renderer, so a plugin emitting SSR-flavoured code throws the moment a
component mounts. But `vitest` with `environment: 'node'` drives Vite's SSR
transform, and both `@vitejs` plugins take the `ssr` flag from their host on
every hook call and expose **no** option to override it
(`@vitejs/plugin-vue-jsx@5.1.6`'s `Options` is `VueJSXPluginOptions` plus
`include`/`exclude`, `babelPlugins`, `defineComponentName`, `tsPluginOptions`,
`tsTransform` — read from the installed `dist/index.d.mts`). The only route to
client output was to reach inside their hooks.

`src/sfc/vite.ts` did that, with two patches that were **not** interchangeable:

- **P1** — pin `ssr: false` on `load`/`transform`. Fixes the codegen.
- **P2** — lie to `configResolved` with `command: 'build'`. Suppresses
  `@vitejs/plugin-vue-jsx`'s unguarded `import.meta.hot.accept(...)`.

The asymmetry was the trap, and both halves of it were measured:

- On **`@vitejs/plugin-vue`**, P1 alone was correct and P2 was actively
  harmful. That plugin gates HMR on `options.devServer`, not on
  `config.command`, so P2 bought nothing — and its own `configResolved` reads
  `config.command` twice, for
  `sourceMap: config.command === "build" ? !!config.build.sourcemap : true`
  and for `transformCachedModule` (`dist/index.mjs` around lines 1694–1710).
  P2 therefore turned `.vue` source maps off under a test runner, silently,
  with every test still green. An earlier version of this record called P2
  "dead code" on this plugin; that was wrong.
- On **`@vitejs/plugin-vue-jsx`**, P1 **alone was worse than no patch at all**.
  It moved the request out of the SSR codegen while leaving it in the SSR
  pipeline, where Vite never rewrites `import.meta.hot`; vitest ships no
  `createHotContext`; every `.tsx` module then died on import with
  `Cannot read properties of undefined (reading 'accept')`.

Measured on vite 8.2.2 / vitest 4.1.11 / plugin-vue-jsx 5.1.6, reference point
`vitest run` without `--typecheck` (840 passed / 56 files at the time; the suite
has since grown to 841 / 57, which does not change what the table compares):

| configuration | result |
| --- | --- |
| P1 + P2 on the JSX plugin, P1 on the SFC plugin | 840 passed / 56 files |
| P2 removed from the JSX plugin | **16 files fail / 733 pass**, all `TypeError: Cannot read properties of undefined (reading 'accept')` |
| no wrapper at all on the JSX plugin | **2 files / 20 tests fail**, all `TypeError: Cannot read properties of undefined (reading 'modules')` at `__vue-jsx-ssr-register-helper:6` |
| P1 removed from the SFC plugin | **3 files / 4 tests fail**, `useSSRContext()` not provided |

**The settlement.** Both `unplugin-*` plugins make the choice a supported
option instead of a patch target, so all of the above becomes configuration:

- `unplugin-vue@7.2.0` resolves `ssr: rawOptions.ssr ?? false` **once** in
  `resolveOptions`, and its `configResolved` — which does rewrite `root`,
  `sourceMap`, `isProduction`, `compiler` and `devToolsEnabled` — never touches
  `ssr`. Its `transform(code, id)` takes two parameters, so it cannot see the
  host's per-call `ssr` flag even in principle. Client output is the default
  and the host cannot override it.
- `unplugin-vue-jsx@0.4.0` has no SSR or HMR code path whatsoever: the string
  `ssr` does not occur in any file of its ESM dist, and its `vite` hook sets
  only `root` and `sourceMap`. Its transform is `@vue/babel-plugin-jsx` and
  nothing else.

With both, `vitest run` is green with **no wrapper of any kind**, and
`src/sfc/vite.ts` is gone. Verified the swap is not a lucky green: forcing
`vue({ ssr: true })` reproduces the P1-removed row above **exactly** — the same
3 files and 4 tests — so the suite genuinely detects SSR `.vue` codegen and the
`ssr` option genuinely reaches it.

**What guards this now.** The source-map half was the part with no test, which
is how P2 could have been wrong for three reviews.
[`test/sfc-source-maps.test.ts`](../../test/sfc-source-maps.test.ts) throws
inside an SFC and asserts the stack frame's *source position*, not merely that
a `.map` file exists — a broken map still yields a frame with the right
filename and only the line number gives it away. Under the old P2-on-the-SFC-
plugin configuration it reports `SourceMapProbe.vue:17:10` and `:19:3` in a
17-line file; under `unplugin-vue` it reports `:9:9` and `:12:1`, the true
positions. Both numbers were observed, the failing one first.

**If you ever go back to the `@vitejs` plugins** — for this package or in a
consumer — the config-level escapes are `test.testTransformMode.web` under
vitest (cost: the whole module graph goes browser-flavoured, so Node idioms in
test files break) and `environments.ssr.consumer: 'client'` under
`vite build --ssr` (cost: flips `resolve.conditions`/`mainFields` to browser
defaults and drops the node-builtins list). Prefer either over patching hooks.

A plain client `vite build` needs none of this — it never drives the SSR
transform. That is why `examples/cli-vite` stays on stock `@vitejs/plugin-vue`
and `@vitejs/plugin-vue-jsx` with no options at all: it is the standing proof
that a consumer inherits none of this package's compiler choices.

## Dev and build compiled JSX with different semantics

Read this before trusting any measurement of JSX behaviour taken from the test
suite. For most of this package's life `pnpm dev` and `pnpm test` compiled
`.tsx` with a **different compiler** from `pnpm build`, and the suite stayed
green at 1035/64 throughout.

**The symptom.** `[Vue warn]: Non-function value encountered for default slot`,
once per component with children, recursively. Under a real PTY the playground
emitted 3 for `counter`, 48 for `layout` and 3199 for `progress`; the test
suite emitted 215 of them per run and no test cared.

**What each path produced.** For the same trivial fixture:

```jsx
<Box flexDirection="column"><Text>x</Text></Box>
```

| path | output |
| --- | --- |
| `pnpm build` (obuild → rolldown → `unplugin-vue-jsx/rollup`) | `createVNode(Box, { "flexDirection": "column" }, { default: () => [...] })` |
| `pnpm dev` / `pnpm test` (Vite, both `ssr: false` and `ssr: true`) | `_jsxDEV(Box, { flexDirection: "column", children: _jsxDEV(Text, { children: "x" }, ...) }, ...)` |

`vue/jsx-runtime` is four lines — it pulls `children` off the props object and
calls `h(type, props, children)` — so a component's children arrive as a
**value** where `@vue/babel-plugin-jsx` passes a **slot function**. Vue's
`createVNode` then sees a non-function default slot and warns.

**The cause is plugin ordering, and it is not obvious from any plugin's docs.**
`unplugin-vue-jsx@0.4.0` declares **no `enforce`** (read
`dist/chunk-OHCVDOP2.mjs`: the factory returns `name`, `buildStart`,
`transformInclude`, `transform`, `vite.configResolved`, and nothing else). It
therefore lands in Vite's *normal* bucket — and `resolvePlugins()` places the
built-in transform **ahead** of `...normalPlugins`. On vite 8.2.2 that
built-in is **`vite:oxc`**, not `vite:esbuild`; its default `include` is
`/\.(m?ts|[jt]sx)$/`, so it claimed every `.tsx` first and compiled the JSX
itself, driven by `tsconfig.json`'s `"jsx": "react-jsx"` +
`"jsxImportSource": "vue"`. By the time `unplugin-vue-jsx` ran there was no JSX
left in the module, so babel silently re-printed it and
`@vue/babel-plugin-jsx` never fired at all. The build path was never affected:
`build.config.ts` hands the plugin straight to rolldown, where it is the only
JSX transform in the graph.

**The fix is `enforce: 'pre'`**, applied in `vite.config.ts` by spreading the
returned plugin (`enforcePre()` there). Both Vite transform modes then emit
slot functions, matching the build byte-for-byte in shape, and every warning
count above falls to **zero** with no JSX call site touched.

**Why `'pre'` and not one of the other levers**, each of which was checked
against the installed sources rather than guessed from its name:

- **Not `oxc.exclude` / `esbuild.exclude` for `.tsx`.** `unplugin-vue-jsx` runs
  babel with `@babel/plugin-syntax-typescript`, which is **syntax-only** — it
  parses TypeScript but does not strip it. Its output still carries type
  annotations and *requires* the built-in transform to run afterwards.
  Excluding `.tsx` would leave TS syntax in the module the runtime evaluates.
- **Not `esbuild: false`.** On vite 8 that is a no-op that logs "`esbuild:
  false` does not have effect any more" and points at `oxc: false` — which
  would disable TS stripping for the entire graph.
- **Not `tsconfig.json`.** Its `jsx`/`jsxImportSource` serve `vue-tsc` as well
  as the transformer; they are unchanged, and `check-types` still passes.

`@vitejs/plugin-vue-jsx@5.1.6` is the corroborating reference: it sets
`transform.order: 'pre'` in exactly the case where it uses the same
syntax-only TS plugin (`tsTransform: 'built-in'`), and drops the ordering only
when it switches to `@babel/plugin-transform-typescript`, which does strip.
`unplugin-vue-jsx` implements the first arrangement's babel setup but omits its
ordering — that mismatch is the whole bug.

**The lesson, which is the reason this section exists.** A green suite proved
nothing about JSX semantics, because the tests and the build used different
compilers. Nothing in 1035 tests asserted *which* compiler had run — the
nearest candidate, `test/jsx-vite.test.tsx`, rendered a tree that produces the
same string either way and filtered warnings down to "Failed to resolve
component", so it swallowed all 215 warnings and passed. Fixing the ordering
changed **no test's behaviour**: the count is 1035 → 1036 purely because of the
guard added with the fix, which asserts that a component's children arrive as
`{ default: fn }`. Observed red under the old config, green under the new.

A note on what could *not* be pinned: an assertion on the warning itself was
attempted and **rejected**, because it could not be observed red. The warning
comes from Vue's slot normalisation and needs a tree shape that neither a
minimal `renderToString` nor a minimal `createApp().mount()` reproduces — both stay
silent under the broken compiler. `test/playground.test.ts` does produce 90 of
them, but only incidentally. Asserting the compiled *shape* is the direct
statement; asserting the symptom would have been a test that never failed.

## Plain `tsx` does not give you working Vue JSX

`@andrew_l/vue-stdout/register` handles `.vue` only. `.tsx` needs a bundler
running `@vue/babel-plugin-jsx` — every `.tsx` compile path in this repo is
configured to do exactly that: `build.config.ts` (`unplugin-vue-jsx/rollup`),
`vitest.config.ts` (via `stdoutPlugins()`, which is `unplugin-vue-jsx/vite`),
`examples/cli-vite/vite.config.ts` (`@vitejs/plugin-vue-jsx`, deliberately a
different family). The first two are handed this package's own
`isCustomElement`, because they compile sources that name the private host
tags; `examples/cli-vite` is handed nothing, which is the point of it.

**Having the plugin in the list is not the same as the plugin running.** For a
long stretch the `vitest.config.ts` / `vite.config.ts` entry above was present
and inert — Vite's own transform reached `.tsx` first and
`@vue/babel-plugin-jsx` never fired. See
[Dev and build compiled JSX with different semantics](#dev-and-build-compiled-jsx-with-different-semantics)
for the ordering rule that keeps it honest, and for why a green suite was no
evidence either way.

The README states the mechanism as: plain `tsx` compiles JSX through
`vue/jsx-runtime`, which hands component children over as **arrays rather than
slot functions**, making Vue warn on every element. A direct probe of a `.tsx`
file run under bare `node --import tsx` in this repo produced a harder failure
than that — JSX compiled to a classic `React.createElement` call and threw
`ReferenceError: React is not defined` at first render. Either way the
conclusion is the same and the rule is unconditional: **do not compile `.tsx`
without a Vue JSX plugin.**
[`test/jsx-vite.test.tsx`](../../test/jsx-vite.test.tsx) pins the supported path.

## `vue-tsc` passing is not evidence that a template prop arrives

Read this before deciding a template is fine because it type-checks. Volar
models a template against the *declared* prop types, and this catalog's
components are `FunctionalComponent<Props>` values with **no runtime `props`
declaration**. The declared types and what Vue actually delivers at runtime are
therefore two different things, and the type-checker only ever sees the first.
Two forms type-check perfectly and used to paint nothing at all. Both are now
fixed, at the same boundary and by the same kind of proof — and both stay fixed
only as long as the next person adding a prop feeds the lists below.

### The bare boolean attribute — fixed, but it needs feeding

`<Text bold>` is `bold: true` in JSX and `bold: ""` in a `<template>`. Vue casts
that empty string to `true` only for props it can see declared as `Boolean` at
runtime, so with no declaration it stayed the falsy empty string and the prop
did nothing — while `vue-tsc` reported `bold: true`, because that is what the
author meant. Every boolean on the catalog was affected: `bold`, `italic`,
`underline`, `strikethrough`, `inverse`, `dimColor`, the `border*DimColor`
family and `ProgressBar`'s `showPercent`. It was live in two shipped examples
that had never rendered dim (`examples/cli-vite/src/Stats.vue`,
`examples/cli-tsx/src/App.vue`).

[`src/components/booleanProps.ts`](../../src/components/booleanProps.ts) now
performs that cast at the boundary where component props become host
attributes, over the explicit key list `BOOLEAN_PROP_KEYS`.

**Adding a boolean prop to any catalog component means adding its name to that
list**, and the components that read it must route through `castBooleanProps`.
Neither is left to discipline:
[`booleanProps.test-d.ts`](../../src/components/booleanProps.test-d.ts) asserts
the list is *exactly* the catalog's boolean-typed props (both directions, so a
new prop fails `pnpm test` at the type level), and
[`test/template-boolean-props.test.tsx`](../../test/template-boolean-props.test.tsx)
drives every listed key through its real component and fails if a component is
not casting.

Why not simply declare runtime `props` on the catalog — the obvious fix — is
argued at length in `booleanProps.ts`. Both reasons were measured against Vue
3.5.13 rather than reasoned about:

- a `props` declaration is **all-or-nothing per component**: with
  `props: { bold: Boolean }`, `h(Probe, { bold: '', color: 'green' })` delivered
  `{ bold: true }` and `color` was *gone*, because Vue routes undeclared names
  into `attrs`. `Box` spreads `{...props}` onto its host element, so a
  booleans-only declaration would have deleted every style passing through it;
- a declared `Boolean` prop that is **absent arrives as `false`**, not
  `undefined`. `borderTop`/`borderBottom`/`borderLeft`/`borderRight` default to
  *on* and are read as `props.borderTop !== false`, so declaring them would have
  erased every border in the package.

### The kebab-case prop name — fixed, and it needs feeding too

`<Box border-style="round">` rendered **no border**, and
`<Box flex-direction="column">` laid out as a row. Same root cause, one step
earlier: Vue camelizes an incoming attribute name only while matching it against
a *declared* prop, so with no declaration `instance.props` is the raw attrs
object and the key reached the host element as the literal `border-style`, which
nothing reads. Unlike the boolean case this was not confined to booleans — it
silently killed *every* multi-word prop, which made it the wider of the two
traps. `vue-tsc` approved it, because Volar resolves the hyphenated name back to
the camelCase prop.

Measured 2026-08-30 against Vue 3.5.13, before the fix: a functional component
with no `.props` received `{"border-style":"round","borderColor":"green",
"dim-color":"","class":"c","style":"s","data-thing":"1"}` — every key verbatim.

[`src/components/kebabProps.ts`](../../src/components/kebabProps.ts) now rewrites
the hyphenated spelling back to the prop it means, at the same boundary the
boolean cast lives at, over the explicit key list `KEBAB_PROP_KEYS` and its
derived alias table. `Box` and `Text` call it; **the rewrite runs before the
boolean cast**, because `<Text dim-color>` is both defects at once — wrong key
*and* the falsy empty string — and the cast only recognises `dimColor`.

Only names the catalog declares are rewritten. A key that merely contains a
hyphen (`data-*`, `aria-*`, anything spread through `v-bind`) is passed through
untouched, which is also what Vue does with an undeclared hyphenated attribute.

**Adding a multi-word prop to `Styles`, `BoxProps` or `TextProps` means adding
its name to that list.** Not left to discipline:
[`kebabProps.test-d.ts`](../../src/components/kebabProps.test-d.ts) asserts the
list is *exactly* those types' multi-word props, both directions, so a new prop
fails `pnpm test` at the type level; it also asserts that `Transform`, `Static`
and `NewLine` — the other components with no runtime declaration — have **no**
multi-word prop between them, so giving one of them a `maxWidth` fails there and
points at the missing `camelizeProps` call.
[`test/template-kebab-props.test.tsx`](../../test/template-kebab-props.test.tsx)
drives every listed key through the rewrite and checks that both catalog
fixtures actually spell it, so the fixture pair's "renders identically"
comparison is exhaustive rather than anecdotal.

`ProgressBar` never had this bug and does not route through the rewrite: it
declares `props` as a string array, and a declaration is all Vue needs —
`normalizePropsOptions` camelizes the declared names, `setFullProps` camelizes
each incoming key. Measured the same day: with `props: ['showPercent', 'value']`,
`{ 'show-percent': '', value: 1 }` arrived as `{ showPercent: '', value: 1 }`.
The corollary is a hazard of its own — a prop missing from that array is
invisible to Vue in *both* spellings — so the array is pinned against
`keyof ProgressBarProps` from both sides. `ErrorBoundary` declares `props: []`
and reads no prop at all; `Spacer` takes none.

Why not simply declare runtime `props` on the rest of the catalog is the same
argument as for the boolean cast, above, and both measurements were re-run
before this fix rather than inherited: a booleans-or-anything-else partial
declaration deletes every other prop, and a complete one still turns an absent
`borderTop` into `false` and erases every border.

## Template whitespace is not JSX whitespace

Two rules in the SFC compiler's default `whitespace: 'condense'` mode change
painted output, and this renderer paints whitespace:

- A text node that is **not** whitespace-only keeps a condensed copy of its
  surrounding whitespace. `<Text>\n  hello\n</Text>` renders `" hello "`, with a
  leading and trailing space; the JSX equivalent renders `"hello"`. So text
  content in a template stays on one line with its element.
- A **whitespace-only** text node in first or last position is dropped
  outright. `<Text>{{ frame }} </Text>` loses its trailing space; put the space
  inside the interpolation instead — `` {{ `${frame} ` }} ``.

Both were hit converting the playground demos to SFC and both are visible in
`playground/demos/Static.vue` and `Text.vue`, commented in place. The
conversion was verified by capturing every demo's frame through a mounted app with
a fixed-size fake stdout and fake timers before and after, and diffing the raw
bytes including ANSI.

## Per-consumer stream listeners garble the frame

`useWindowSize` originally attached one `'resize'` listener per calling
component. Fifteen mounted consumers exceeded Node's default `maxListeners` of
10 and printed a real `MaxListenersExceededWarning` to **stderr, mid-frame** —
exactly the interleaved-output corruption this package builds `patchConsole` to
prevent. `Container` already holds a listener of its own, so the real budget is
smaller than 10.

The same shape had a second defect: subscribing unconditionally, while
`Container` subscribes only when interactive, meant the hook reported 60 columns
while the layout stayed at 20.

Both were one defect surface, fixed as one: `Container.windowSize` is a single
`shallowRef`, written only by `Container.syncWindowSize` from the numbers it just gave
the layout, exposed through `StdoutContextValue`; `useWindowSize` is two
`computed`s and no lifecycle. Exactly one listener regardless of consumer count,
and one writer feeding both the layout and the hook.

**The pattern, not just the instance.** The same branch had just finished
removing per-consumer mirror state from `FocusManager` (it was an `EventEmitter`
plus a hand-written mirror ref in every consumer) when a new composable
reintroduced the identical shape. Shared terminal state gets one owner and
`computed` derivations; check for this before adding any composable that
subscribes to anything. Pinned by
[`test/use-window-size.test.ts`](../../test/use-window-size.test.ts), which
asserts `listenerCount('resize') === 1` across 15 mounted consumers and captures
stderr to prove no warning.

## `testTransformMode.web` fixes the codegen and moves the whole graph

Setting `test.testTransformMode.web` in `vitest.config.ts` is a legitimate fix
for the SSR-codegen problem, and it passes — 808/808 at the time it was tried.
It was **rejected** anyway, and the reasoning is the durable part.

It routes the entire module graph through Vite's browser asset pipeline. Observed
consequences: it rewrote `new URL('.', import.meta.url)` and broke
`test/sfc-register.test.ts` until that file was excluded by glob; it flips
`process.env.SSR`; it mocks `require.extensions`; and it stops treating Node
builtins as builtins. "Passes today" is not "no behavioural difference" — and
trading a contained 48-line wrapper for a global pipeline change *plus* a
growing glob exclusion list is the wrong direction.

The same reasoning rejects `--options.transformMode.web` on the `dev` script.
The costs are written into the README's "Hosts that drive the SSR transform"
section so a consumer choosing between them sees them, and the two config
alternatives remain a *documented recommendation for consumers still on the
`@vitejs` plugins* — this ruling is about **this package's** suite, which took
the third route and changed plugins instead.

## A `{@link}` to a private symbol ships silently

TSDoc blocks are copied **verbatim** into the built `.d.mts`. Nothing in the
toolchain resolves or validates `{@link}` targets.

A draft used `{@link pinSsrFalse}` inside `forceClientTransform`'s doc block
(both symbols since deleted along with the `/vite` entry point). `pinSsrFalse`
was not exported, so it did not appear in the built `.d.mts` at all — the link
would have shipped to consumers pointing at a symbol they cannot see. It was
caught only by grepping the **built** types, not the source.

Check the built output, not the source, whenever a doc block gains a link. A lint
rule for this does not exist yet and would be worth having.

## A duplicated `tsx` hid an unresolvable dynamic import

`src/sfc/hook.ts` did `await import('./compiler-options')` — an **extensionless
relative specifier**, which Node's ESM resolver cannot resolve. It worked only
because `tsx@4.19.2` patched resolution to guess the extension. `tsx@4.22.4`
stopped doing that, so the module threw `ERR_MODULE_NOT_FOUND` and took
`test/sfc-register.test.ts` with it.

Two things make this worth remembering:

1. **Fixing the duplicate-`tsx` type error *exposed* this.** They had to land
   together, ordered so each commit is independently green (the import fix is a
   no-op under 4.19.2). Papering over the type error with a phantom pinned devDep
   or a `paths` override would have buried the resolution bug instead.
2. **The published package was never affected.** obuild rewrites the specifier,
   so `dist/sfc/hook.mjs` contains `../_chunks/compiler-options.mjs`, with an
   extension. This was a *source-run* defect only — which also means
   `examples/cli-tsx` is not a regression test for it: its `/register` import
   resolves through the exports map to `dist/`, and the `src/**` paths in its
   stack traces are sourcemaps. The real guard is
   [`test/sfc-register.test.ts`](../../test/sfc-register.test.ts).

The fix names `.ts` (legal via `allowImportingTsExtensions`), which makes
resolution correct under plain Node rather than leaving a resolver remap
load-bearing, and matches how `register.ts` already names `./hook.ts`. This was
the only dynamic relative import in `src/`; the other ~145 extensionless relative
imports are static, resolved at compile time, and unaffected.

## A JSDoc block attaches to the next declaration, whichever it is

In `src/measureElement.ts` a 38-line JSDoc block intended for the exported
`measureElement` sat above a small private `orZero` helper that happened to be
declared between them. Typedoc documented `orZero`; the exported function had no
documentation at all. Nothing warned.

Fixed by moving `orZero` above the block — function declarations hoist, so no
behaviour changed. Worth a glance whenever a helper is added near a documented
export.

## Verifying interactive behaviour needs a real PTY

Raw mode, cursor placement and the alternate screen only behave correctly against
a real terminal, and the test suite deliberately cannot exercise them:
[`test/setup/no-real-raw-mode.ts`](../../test/setup/no-real-raw-mode.ts) is a
tripwire that **throws** on any real stream's `setRawMode`, from anywhere. Tests
must pass a fake stdin from `test/helpers/create-stdin.ts`.

So interactive checks happen either in the playground (`pnpm dev`), or under a
PTY allocated explicitly. **Both methods work; this has now been checked three
times and the failure has never reproduced.**

- `script -q /dev/null <cmd>` — allocates a working TTY, raw mode succeeds, and
  the frame is captured. Wrap it in `timeout N` and redirect stdin from
  `/dev/null`, since the app runs until quit. Its capture carries a leading
  `^D` and CR line endings, which is cosmetic.
- Python's `pty.openpty()` — also works, and is the tidier of the two: it exits
  0 under your own control and adds no prefix. Worth the extra few lines when
  you want the bytes clean.

One earlier session recorded `script -q /dev/null` as unusable here
(`tcgetattr/ioctl: Operation not supported on socket`) and routed around it. Two
later re-checks, most recently the vite 8 migration, both found it working —
including for a `pnpm`-wrapped command (`pnpm start`), which that session also
warned would capture nothing. Treat the original failure as a one-off property
of that session's environment, not of this repo. If a PTY method appears broken,
re-test the other one before concluding anything.

## Without the `file-changed` forwarding, HMR is a fast full reload

The `./dev` plugin runs the app in Vite's runnable `ssr` environment, with
`server.ws` off — the browser socket has no client here. But `unplugin-vue`
broadcasts its **rerender-versus-reload decision** as a `file-changed` custom
event through `server.ws`. The module runner never sees it, the compiled SFC's
`__VUE_HMR_RUNTIME__.CHANGED_FILE` stays stale, its `_rerender_only` export is
`false`, and **every** SFC edit takes the state-resetting `reload` branch.

[`src/vite/bridge-hmr.ts`](../../src/vite/bridge-hmr.ts) is fifteen lines that
forward custom payloads from `server.ws` onto `environments.ssr.hot`, and they
are the difference between HMR and a restart.

**What makes this expensive to discover is that the frame still updates without
it.** `reload` recreates the component with the new template, so a demo that
checks "did my edit appear on screen" passes either way. Measured both ways
against vite 8.2.2 / unplugin-vue 7.2.0, over a PTY, editing one static string
in `playground/demos/Counter.vue` with the counter sitting at 3:

| forwarding | counter after the edit | new template text |
| --- | --- | --- |
| off | **0** | shown |
| on | **3** | shown |

Two rules follow, and they are easy to get backwards:

- **`server.hmr` must stay on.** `unplugin-vue` gates its entire HMR emission on
  `server.hmr !== false`, so turning it off silently removes `__hmrId`,
  `createRecord` and `import.meta.hot.accept` from every compiled SFC — and it
  also stops the module runner ever receiving `full-reload`.
- **`server.ws: false` is hygiene, not correctness.** Vite swaps in a stub whose
  `send` is a no-op, which the bridge wraps just as happily as the real one.
  What it buys is not standing up a WebSocket server, an upgrade handler and
  origin checks in a process whose only client is in-process. Do not claim it is
  required for HMR to work.

## The whole dev server, measured end to end once, under a PTY

Nothing in the suite starts a Vite server: every automated test drives the seam
with a stand-in hot context. This is the record of one deliberate end-to-end
run against a real one, so the next reader inherits evidence rather than
assumption. Method: Python `pty.openpty()`, a 100×30 window, `pnpm dev counter`,
keystrokes written to the master fd, source files edited on disk mid-session and
restored afterwards. Measured against vite 8.2.2 / unplugin-vue 7.2.0 at
`0afca13`.

| step | expected | observed |
| --- | --- | --- |
| start `pnpm dev counter` | frame paints | paints in ~10 s (first Vite compile) |
| `+` ×3 | count reaches 3 | 3 |
| edit the **template** of `Counter.vue` | frame updates, state survives | new text shown, **count still 3** |
| edit the **script** of `Counter.vue` | component recreated | new row appeared, **count reset to 0** — Vue's own semantics |
| edit a **`.tsx` demo** (`layout.tsx`) | reloads | full reload, **count reset** — and the demo was not even on screen |
| edit the **entry** (`playground/index.tsx`) | full reload | full reload, count reset |
| Ctrl+C | exits, terminal restored | exit code 0, termios fully restored |

Three things worth carrying forward.

**Raw mode is entered and restored, and this is now measured rather than
inferred.** Reading the pty's termios at three points in one session:

| moment | ECHO | ICANON | ISIG |
| --- | --- | --- | --- |
| before launch | true | true | true |
| while the app is live | **false** | **false** | **false** |
| after Ctrl+C | true | true | true |

`ISIG=false` also means Ctrl+C arrives at the app as a byte and is handled by
`exitOnCtrlC`, not delivered as a signal — the intended path, and the one that
exits 0.

**A full reload stacks a dead frame, and here is the byte-level proof.** Item 10
of the branch review predicted this; it reproduces on the first reload. The
entire 840-byte reload window contains **no cursor movement and no erase of any
kind**:

```
cursorUp=0  eraseLine=0  eraseDisplay=0  clearScreen=0  frameTops=1
```

It opens straight into a fresh frame (`\x1b[2mCounter · esc back to the menu …`)
and paints all of it. Steady-state repaints in the same session used 48
`cursorUp` and 52 `eraseLine` sequences, so the renderer certainly *can* erase —
a reload simply does not, because `Container.destroy()` deliberately leaves the
last frame in scrollback (correct for a real unmount, matching ink) and the new
mount starts with an empty `screenLines`. Under `pnpm dev` that runs on every
edit, so each hot reload appends one dead frame below the last. Not fixed; the
mechanism is `Container.ts`'s `destroy()` plus the fresh mount's cursor origin.

**Shutdown writes zero bytes.** Ctrl+C produced an empty output window
(`b''`) and exit code 0. That is consistent — this demo never hides the cursor,
so there is nothing to restore — but it means the shell prompt returns wherever
the last frame left the cursor rather than on a fresh line. Cosmetic, and worth
knowing before anyone goes looking for a missing teardown write.

## A synchronous throw in a Vite hot listener kills the process

Vite's module runner notifies `vite:*` listeners with
`await Promise.allSettled(cbs.map(cb => cb(data)))`. `allSettled` catches
**rejections** — but a listener that throws *synchronously* throws inside
`.map`, before any promise exists. It escapes the notifier, escapes the async
HMR handler, and lands as an unhandled rejection that ends the Node process.
The same listener written `async` has its rejection swallowed and the reload
proceeds. Measured against vite 8.2.2.

This is not a theoretical hazard here. Everything
[`src/dev/bridge.ts`](../../src/dev/bridge.ts) does on `vite:beforeFullReload`
is synchronous by design — `Container.destroy()`, `app.unmount()`, raw-mode and
alternate-screen restoration — so a failure inside it is exactly the fatal
shape, and it would take the dev server *and* the terminal restoration with it.
Each handler therefore contains its own throws, and each registered mount is
released inside its own `try`, so one failing mount cannot leave a second one
holding a terminal the re-imported entry is about to paint over.
`src/dev/bridge.test.ts` holds both properties.

Two neighbouring facts about the same code path, free to inherit:

- The runner **re-imports the entry itself** after a full reload. It awaits the
  `vite:beforeFullReload` listeners, clears `evaluatedModules`, then re-imports
  every module with no importers. Nothing in this package re-imports anything,
  and adding it would evaluate the entry twice. The *outcome* is documented at
  `vite.dev/guide/api-environment-runtimes`; the ordering and the entrypoint
  computation are read off the shipped source and are version-coupled.
- **A circular importer of the entry disables full reload entirely, and
  silently.** The runner collects entrypoints by walking *up* the importer
  graph to modules with no importers; if anything imports the entry back, that
  set is empty and the whole branch returns before it notifies anyone. No
  event, no re-import, no error — the app just runs on stale code. The
  reassuring half is that teardown sits on the same side of that guard, so
  "torn down and nothing remounted" cannot arise from it.

## Resetting styles every frame throws away Yoga's layout cache

The engine used to call `resetYogaStyles` + `applyStyles` on every element on
every frame. It looked like a small constant: a few dozen setters per element,
against a layout algorithm assumed to be the expensive part. Both halves of that
assumption were wrong, and a 2026-08-31 audit measured the whole thing.

**Yoga's own layout maths is not the cost.** `calculateLayout` on a clean tree
measures 0.000 ms. In a CPU profile of 4 000 dashboard frames, ~26 % of all
samples were in the JS↔WASM dispatch and embind wrappers and ~4 % inside Yoga's
compiled functions. **We were paying six times more to *call* Yoga than Yoga
cost to run.** Any fix aimed at the layout algorithm would have found nothing;
the metric that matters is the number of calls across the boundary, which was
~88 per element per frame to ink's ~7.

**And the call count was the smaller half.** Yoga's style setters mark a node
dirty when a value actually changes, so the reset+apply pair is not idempotent
from Yoga's point of view: `resetYogaStyles` writes `RELATIVE`/`ROW`,
`applyStyles` writes the element's real `absolute`/`column` straight back, and
Yoga invalidates the subtree — every frame, for a tree nothing touched. Bisected
on a `<Static>` box holding 5 000 flushed children:

```
1 calculateLayout, tree clean       0.000 ms
2 + beginSquashFrame                0.000 ms
3 + resetYogaStyles(<Static> box)   0.009 ms
4 + applyStyles(<Static> box)       4.519 ms   <- 500x
```

Note where that lands: the `prepareNode` skip for flushed `<Static>` children
was doing its job perfectly — 59 Yoga calls reached `computeLayout` — and the
whole win was thrown away one line earlier, by restyling the box itself.

The fix is `DOMElement#yogaStylesDirty`: reset and apply only for elements whose
attributes changed. Measured, steady repaint at width 100: **−82 % on a deep
tree, −72 % on a 1 482-node grid, −47 % on a dashboard**, and 88 → ~30 Yoga
calls per element per frame. ink and vue-tui both apply styles at mutation time
and always did.

Two consequences worth keeping in mind before touching this area again:

- **The reset half is not optional and not simplification bait.** Every setter
  in `applyStyles` is guarded by `'x' in style`, so a withdrawn property is
  skipped rather than cleared; the reset is what makes removal work. Keeping the
  pair together is also what lets us skip ink's and vue-tui's family-reconciler
  machinery entirely. The `alignContent` falsy branch in `applyStyles.ts`
  belongs to the same argument.
- **Anything that was silently relying on "everything is dirty every frame" now
  has to say so.** One already was: `applyMeasureFunc` keyed its `markDirty`
  guard on the squashed text alone, while `measureElementText` also wraps by
  `getTextWrapStyle`, which cascades from ancestor `<Box>`es. Yoga caches a
  measurement per node, so an ancestor's `textWrap` change never got the
  descendant re-measured. That was a live rendering bug before this change, not
  a consequence of it, and the guard now keys on the wrap mode too. If you add
  anything else whose measured or laid-out result depends on state outside the
  element's own attributes, it needs its own invalidation.

The same audit found the other repeat: `Layer` re-tokenised every line every
frame, with ~35 % of all profiled CPU inside `@alcalzone/ansi-tokenize`, where
ink and vue-tui both memoise. `LayerCaches` closes it (−19 % on text-heavy
frames). A memo keyed on the exact string cannot go stale — but it must be keyed
on the **post-transformer** line, and the `StyledChar` objects it hands out are
shared across cells and frames, so nothing may mutate one.

The third repeat is the same lesson once more, and it is the one most likely to
be misdiagnosed. `syncBoundingClientRect` ran for every element on every frame,
whether or not anything subscribed. **The events are not the cost** — `emit`
with no listeners is 16 ns, 0.016 ms for 1 001 elements. The cost is
`getContentRect`: twelve Yoga getters to build one rect object, once per element
per frame. Gating on `listenerCount()` is −33 % of a large-grid frame and −55 %
of a deep-tree frame *after* the two changes above. `getBoundingClientRect()`
computes from Yoga on read instead, so the public API no longer depends on the
paint walk having visited the element — which also makes it correct inside a
`display: none` or already-flushed `<Static>` subtree, where the walk never
went. Yoga answers `NaN` for a node it has never laid out; that is normalised to
`0` so an unlaid-out element still reads back zeros.

`test/yoga-call-budget.test.ts` holds the call count, deterministically, so a
regression of this shape fails a test rather than surviving four subprojects.
It is ~10 calls per element per frame today, from ~88.

## Building the tree is a Yoga cost too, and no benchmark of a frame will show it

Every measurement above times a frame of an **already-built** tree. Under that
lens the `DOMElement` constructor is free, and it was not: it ran the full
`resetYogaStyles`, **57 wasm crossings per element**, so a 1 001-element tree
cost 57 000 Yoga calls to build where ink's cost 6 400 — 4-8× slower on every
workload, unnoticed through the whole per-frame investigation because no frame
benchmark can see it. First mount pays it, and so does every structural change:
a list that rebuilds pays it constantly.

**54 of those 57 writes were Yoga's own defaults, written back over themselves.**
Dumping all 59 readable style properties off a node fresh from
`Yoga.Node.create()` and off one that took the full reset: exactly **three**
differ — `flexDirection` (Yoga defaults to COLUMN, CSS to row), `flexWrap` (this
engine's wrap divergence) and `alignContent` (STRETCH, the consequence of that
divergence). Everything else — every margin, padding and border edge, every gap,
`flexShrink`, `flexBasisAuto`, `alignItems`, `display`, the min/max box — a new
node already holds.

So a new element takes `initYogaStyles`, which is those three, and the full
reset stays where it is genuinely needed: `prepareNode`, over a node that has
been *used*, where a withdrawn property has to be cleared. Nothing is skipped —
`yogaStylesDirty` starts `true`, so the reset+apply pair still runs before the
element is first laid out. Construction went **57 → 8 Yoga calls per node** and
**4.2-8.5× ink → 0.7-1.1×**, with repaint and resize unmoved.

Two things to keep in mind here:

- **`initYogaStyles` and `resetYogaStyles` must agree on a fresh node**, and
  only a test can hold that. The reset calls the init, so the three cannot
  drift; what can drift is a *new* default added to the reset that Yoga does not
  itself default to, which would then be missing from every newly built element.
  `DOMElement.test.ts` diffs all 59 properties rather than listing the three, so
  it catches an addition it has never heard of.
- **The state does become observable, for one element.** `prepareNode` skips an
  already-flushed `<Static>` child's whole subtree, so a descendant added there
  later is never restyled — the three writes are what keep even that element on
  this engine's defaults rather than Yoga's.

With those 54 crossings gone, the second construction cost became visible and is
the mirror image of the first: `yogaChildIndexOf` scans `childNodes` to find a
child's index in the parent's *Yoga* child list (the two differ whenever a text
or comment child sits in between), which makes filling a list by appending
O(n²). ink appends with `getChildCount()`, O(1). Taking that shortcut
unconditionally is **not** the answer, and this is the useful part: one
`getChildCount()` is a wasm crossing at ~0.17 µs while one step of the scan is
~2.4 ns, so it only pays past ~70 siblings. Measured, always taking it costs
13 % on a tree of short rows; never taking it costs 47 % on a tree of one long
one. `linkYogaChild` takes it only for an append into a list already past
`YOGA_INDEX_SCAN_LIMIT` (64), and both ends improve.

Its premise is the subsequence invariant already documented on `DOMNode#yogaNode`
— the parent's Yoga child list is exactly the yoga-owning members of
`childNodes`, in order — so with the child sitting last in `childNodes` and not
yet inserted, Yoga's count *is* the index. The one place that invariant is being
*rebuilt* rather than held is `updateYogaOwnership`'s relink loop, which links
children in `childNodes` order, so it holds there too. `DOMNode.test.ts` covers
the append, the insert-before-a-ref path, a move to the end, and that relink
loop, each with a comment child interleaved so a shortcut that quietly used the
DOM index fails; against that break Yoga aborts on all four.

## Vue builds the tree bottom-up, and every benchmark here builds it top-down

The section above ends with construction at parity with ink — measured by a
harness that builds a tree the way a benchmark finds convenient: create a node,
attach it to its parent, then fill it. **No framework does that.** Vue's
`mountElement` creates the element, mounts its children *into* it, and only then
inserts it into its parent, so a mounted tree is assembled almost entirely while
still detached and travels upward one level at a time.

That difference is not cosmetic, because `DOMNode#insertBefore` pushes the root
document down the subtree it just received. Top-down, the subtree is always
empty and the push is O(1). Bottom-up, the subtree is everything built so far,
so an insertion at depth *d* re-walks it — O(n·depth) for the mount, and again
for the unmount, where `destroy()` recurses and each child's `remove()` walks
its own subtree to `null` a second time. Every one of those extra visits writes
the value the node already held.

Measured through `createApp().mount()` on a 150-deep chain:

| | walks started | nodes visited | visits that changed anything |
| --- | --- | --- | --- |
| mount | 977 | **80 704** | 488 |
| unmount | 489 | **40 109** | 488 |

`setRootDocument` now returns as soon as it is handed the root the node already
holds. Mount fell to 1 507 visits, unmount to ~500; the deep tree's synchronous
mount **−46 %** (2.64 → 1.43 ms) and its unmount **−74 %** (0.81 → 0.21 ms,
2.26× ink → 0.65×). Isolated teardown **−59 %** on `deep` and −5 to −7 %
everywhere else. Repaint, update and resize did not move.

The guard is only sound because of an invariant worth stating in full: **a
node's subtree always shares its root.** `setRootDocument` is the only writer of
`root` outside the constructor, and every path that changes one goes through it
and recurses — so a node already holding the value cannot have a descendant that
does not. `DOMNode.test.ts` pins *that*, not the shortcut: a test of the
shortcut passes trivially when the shortcut never fires, where a test of the
invariant fails the moment someone stops recursing.

Two lessons, and the second is the one that generalises:

- **A flat tree hides a depth-quadratic cost completely.** `wide`, `large grid`
  and `dashboard` all moved by nothing, because at depth ~3 the waste is linear.
  Only the 150-deep chain showed it, and it showed it as more than half the
  mount.
- **Build order is a property of the measurement, not of the engine.** Four
  benchmark files in this package built trees top-down, and the one cost that
  order hides is exactly the one a user pays. Measuring the real entry point —
  `createApp().mount()` against a fake stdout — is what found it; nothing that
  starts from an already-built `DOMDocument` ever could.

## `{slots.default?.()}` in JSX builds a Fragment, and a Fragment costs two host nodes

`<stdout-box {...attrs}>{slots.default?.()}</stdout-box>` compiles to
`createVNode('stdout-box', attrs, [slots.default?.()])` — the slot's children
**nested inside** a one-element array. A nested array is not a vnode, so Vue's
`normalizeVNode` turns it into a `Fragment`, and a Fragment mounts with an
anchor node on each side. Every `<Box>` and every `<Text>` therefore carried two
extra host `DOMText` children whose value is always `''`.

A mounted tree had roughly **twice as many host nodes as it had elements** —
3 204 for an 801-element tree, 489 for a 168-element one. Each is a `DOMNode`,
which extends `EventEmitter`, and each has to be allocated, linked,
`setRootDocument`-walked, skipped by `paintChildren` and counted by
`yogaChildIndexOf`. Passing the slot's array straight to `h()` is the same
children with none of that: synchronous mount **−7 % to −34 %** and first paint
**−6 % to −20 %**, depending on shape.

Two things worth carrying forward:

- **The frame is byte-identical either way**, so the whole suite — parity
  included — stays green if the wrapping array comes back. Only a test that
  looks at the host tree's *shape* can hold it, which is what
  `test/component-host-tree.test.tsx` does.
- **This was invisible to every benchmark in the package**, because they all
  build a `DOMDocument` by hand and none of them has ever gone through a
  component. The anchors do not exist unless Vue mounts the tree.

`Box.tsx` and `Text.tsx` therefore call `h()` rather than JSX. `NewLine.tsx` is
now the only source file writing a host tag as JSX, and it is what keeps the
`isCustomElement` requirement (and `test/jsx-vite.test.tsx`) honest.
`Static.tsx` and `Transform.tsx` were already on `h()` for their own reasons and
never had the problem.

## A reset undoes a previous application, and the first one has nothing to undo

The same waste as the constructor's, one phase later, and it survived
`initYogaStyles` because that fix looked at the constructor and stopped there.
`prepareNode` ran `resetYogaStyles` + `applyStyles` for every element whose
`yogaStylesDirty` was set — and it starts `true`, so on the **first layout pass
that is every element in the tree**, over a Yoga node that has never been
written to. The reset's whole job is to clear what a *previous* application left
behind. On a first application there is nothing to clear, and its 52 writes are
52 JS↔WASM crossings that leave the node exactly as they found it.

Measured by wrapping every Yoga style setter so that the matching getter is read
before and after each call, and counting the calls whose after-state equals
their before-state — the same instrument the constructor's 54-of-57 came from,
pointed at the layout pass instead:

| workload | style writes on the first pass | of which changed nothing |
| --- | --- | --- |
| deep (153 el) | 8 411 (55.0/el) | 7 956 — **94.6 %** |
| wide (801 el) | 41 655 (52.0/el) | 41 652 — **100.0 %** |
| large grid (1 001 el) | 53 575 (53.5/el) | 52 572 — **98.1 %** |
| bordered (361 el) | 19 735 (54.7/el) | 18 772 — **95.1 %** |
| dashboard (84 el) | 4 445 (52.9/el) | 4 382 — **98.6 %** |

`applyStyles` itself is frugal — every setter is `'x' in style`-guarded, so a
typical element writes 0 – 3 values. **Essentially all of that column is the
reset.** Timed on its own against a freshly built tree, `resetYogaStyles` was
**58 – 64 % of the first layout pass** on all eight workloads.

`DOMElement#yogaStylesPristine` is the flag that skips it: true while nothing has
written a style to the node, cleared by the two writers that exist
(`prepareNode`'s apply pair and `computeLayout`'s root `setWidth`), set back to
true only where a brand-new Yoga node replaces the old one. The first layout
pass went from **52.0 – 55.0 style writes per element to 0.00 – 2.97**, and the
pass itself **−67 % to −72 %**; end-to-end first paint −19 % to −35 %, with
repaint, resize, update, construction, teardown and unmount unmoved.

Three things this leaves behind:

- **A "skip if unchanged" guard on each write is the wrong shape, and it is
  worth knowing why.** It trades a setter crossing for a getter crossing, and a
  Yoga read is not cheaper than the write it avoids: measured at 0.82× a
  `setMargin`, 0.85× a `setFlexDirection`, 0.88× a `setFlexGrow` and **1.98×** a
  `setWidthAuto`. Even where *every* write is redundant the guarded form saves
  7 – 13 %, and on `width` it costs 94 % more. A JS boolean crosses nothing. The
  general lesson: on a WASM boundary, cheap state on the JS side beats asking
  the other side anything.
- **The flag is cleared unconditionally after an application, even when
  `applyStyles` wrote nothing** — and that conservatism is load-bearing, not
  laziness. `computeLayout` writes the available width straight onto the layout
  root's Yoga node, the one style write that does not go through `applyStyles`.
  `prepareNode(root)` runs first and clears the flag, so the window closes; a
  "keep it pristine when the element has no style attributes" refinement
  re-opens it, and the element stays stuck at the width it was last laid out as
  a root at. `layout.test.ts`'s *clears the width a layout root was given* is
  that case, and it is red against exactly that refinement.
- **What is left is the floor, and it is text.** With the reset gone, a CPU
  profile of the first pass over the wrapping workload is 63 % `wrap-ansi` /
  `string-width` / `widest-line` and 2 % Yoga dispatch. Every string has to be
  measured once; a steady repaint is 10 – 22× cheaper than a first paint only
  because `withCache` already holds the answers by then.

## The invalidation contract for render caches

Four caches now sit on the render path — squashed text, resolved `textWrap`,
`Layer`'s tokenised lines, and each node's computed rect. They are cheap and
they are the reason this engine keeps up with ink. They are also the shape of
bug this package has already shipped once (the `textWrap` cascade above), so
before adding a fifth, or widening one, the rule is:

**Enumerate every input the cached value is a function of — from the code — and
name the line that reaches the invalidation for each. An input with no named
path is a stale render waiting to happen.** "Nothing changes it in practice" is
not a path. Cascading ancestor state is the input that gets missed, every time,
because it does not appear anywhere in the element you are caching against.

Two kinds of key have very different risk, and it is worth knowing which you
are writing:

- **Keyed on the value itself** — `LayerCaches` keys on the exact line string
  and each entry is a pure function of that string; the row memo keys on a
  row's sequence of `StyledChar` object identities and `styledCharsToString` is
  a pure function of exactly that. There is no input to invalidate *on*: a
  different value is a different key, and the worst a change can do is cause a
  miss. **These are the only ones that may be held across frames**, and the
  only question they raise is memory.
- **Keyed on a frame generation** — `squashTextNodes`, `getTextWrapStyle`, and
  the rect memo. These say "valid until the boundary", so the whole argument is
  that the boundary really does bound every input. Get the boundary wrong and
  the cache is silently, plausibly wrong. **Do not extend one of these across
  frames**; a frame boundary is the only thing making it true.

### Holding a value-keyed cache across frames

`Renderer` reuses one `Layer` where ink allocates a fresh `Output` per frame, so
ink's `OutputCaches` structurally cannot outlive a frame and ours can. That is
this engine's one architectural advantage over ink and it is now spent: the line
memo rotates two generations instead of clearing, and the row memo reuses a
row's serialised string when the row holds the same cells it held last frame.
Steady repaint went from 1.05–1.97× ink to 0.12–0.86× on seven of eight
workloads, and the worst case — every line on screen changing every frame —
measured **no worse** than the per-frame form (0.66–1.09× ink against
1.00–1.13×), because the identity scan bails at the first differing cell.

Three things that were not obvious, in the order they will bite:

- **Surviving the frame turns retention into the whole problem.** A memo of
  every line the process has ever drawn measured **+2 078 MB** of heap over
  3 000 frames of entirely fresh content, against +78 MB for the per-frame form.
  The fix is not a capacity to tune: `rotate()` keeps exactly what the *last
  frame* used, so retention is two frames' distinct lines forever, while a
  screen that keeps redrawing itself hits indefinitely. Measured back at
  +78.0 MB, i.e. nothing over the per-frame form.
- **The row memo's arrays must be freshly allocated every frame.** It decides a
  row is unchanged by comparing it cell by cell against `previousRows[y]` — and
  `previousRows[y]` *is* that array once the frame ends. Reusing and refilling
  the grid would compare each array with itself, every row would look unchanged,
  and the frame would freeze on its first paint with the whole suite green. This
  is the single most dangerous edit anyone can make to `compute()`; it is
  commented at the allocation and held by nine cases in `Layer.test.ts`.
- **Nothing may ever mutate a `StyledChar`.** Both caches now share those
  objects between frames as well as between cells, and every blank cell in the
  grid is one shared `BLANK_CELL`, so a single in-place edit would reach the
  whole screen. It is keepable because `@alcalzone/ansi-tokenize` is
  copy-on-write throughout — `[...codes]`, `.filter`, `.map` — and `compute()`
  replaces cells rather than editing them. Check that property before reaching
  for a different tokeniser.

The rect memo (`DOMNode#getComputedRect`/`getContentRect`) is the cleanest
example of the second kind, because it has exactly **one** input:
`calculateLayout` ran. Everything that can move a rect — a style write, an
inserted or removed child, edited text, a narrower terminal, an ancestor's
`textWrap` — moves it only *through* a layout pass. Each of those dirties Yoga,
and dirtying changes nothing readable until the next `calculateLayout`. So one
`beginRectFrame()` beside the one `calculateLayout` covers all of them, and
`test/rect-cache.test.ts` holds one case per input, each seen red with that call
removed.

Two things about it are less obvious than they look:

- **The generation is bumped *after* `calculateLayout`, not before.** A rect read
  taken during the style/measure pass — from inside a Yoga measure callback, say
  — must still see the layout that exists at that moment, which is the previous
  one. Bumping first would let such a read cache pre-layout coordinates under
  the new generation and hand them to the paint pass. Nothing reads a rect there
  today; the ordering is what keeps that from mattering.
- **A replaced Yoga node is not a re-laid-out one.** `updateYogaOwnership` frees
  the node and builds a fresh one when an element crosses the virtual-text
  boundary, without any layout pass, so it drops the memo itself. And the
  missing-node guard has to sit *ahead* of the memo, or a destroyed element
  reads back a rect belonging to freed WASM memory.

Each call still returns a **fresh object**. `getComputedRect`/`getContentRect`
are public API; handing out the cached one would make a caller's
harmless-looking `rect.width--` corrupt the engine's own coordinates for the
rest of the frame. The saving being chased is the JS↔WASM crossings, which
measure ~0.29 µs each against nothing for the allocation.

## Latent hazards, documented and deliberately not fixed

Not bugs today; each is reachable if a surrounding assumption changes.

- `applyStyles.ts` guards a falsy `alignContent` explicitly (line ~611). It is
  **reachable, not theoretical**: `patchProp` deletes an attribute only when the
  value is strictly `undefined`, so `align-content=""` or `:align-content="null"`
  lands there. It is also load-bearing now that styles are applied only on
  change — with no per-frame reset, this branch is the only thing that restores
  `ALIGN_STRETCH` when `alignContent` is withdrawn to a falsy value. An earlier
  pass recorded it as unreachable; that was wrong.
- `squashText.ts` uses one module-global generation counter. A bare
  `squashTextNodes` call without a preceding `beginSquashFrame()` shares the
  ambient generation with the previous one and returns the cached (possibly
  stale) string instead of recomputing. Unreachable today because every
  production path (`Renderer#render`, `renderToFrame`, `renderToString`) calls
  `computeLayout` — and therefore `beginSquashFrame` — before painting.
- The `maxFps` throttle is `Renderer`'s `canRender` gate, consulted **before**
  the layout+paint pass rather than applied to the frame it returns — the
  ordering ink has, and the one this package spent four subprojects without. A
  measured 125 Hz source at `maxFps: 30` computed 400 frames to show 104, so
  three quarters of the engine's per-frame work went on frames nobody could see,
  and the whole per-frame performance programme was handed back in aggregate.
  Two consequences to keep in mind before touching it. **`<Static>` has to
  bypass the gate, not just the write**: its content does not exist until the
  pass produces it, and the bypass has to fire on a `<Static>` box's child count
  changing *in either direction* — a shrink prints nothing but is the only
  chance `collectStaticOutput` gets to clamp `staticFlushedCount` back down, and
  a shrink no pass observes strands that count and loses the next item in the
  vacated range forever. **`useBoxMetrics`/`useContainerSize`/`measureElement`
  now refresh once per shown frame**, not once per update, because the
  `layout`/`resize` events are emitted by the pass; the settled value still
  always arrives, since the trailing frame both lands and measures.
- `useCursor` clears the cursor rather than restoring it when the **last** writer
  unmounts while an earlier consumer is still mounted. Ownership is tracked by
  `WeakMap`, not reference-counted, because a count cannot express "restore the
  previous owner's position"; restoring would need a position stack.
- `alternateScreenRefCounts` (`Container.ts`) and `liveApps` (`createApp.ts`)
  are module-scoped, while the dev bridge's own state is on `globalThis`. That
  asymmetry is deliberate for now, not an oversight: two *copies* of those
  modules in one process would each keep their own terminal bookkeeping, and
  the symptom would be a user stranded in an empty alternate buffer after one
  reload too many. The dev server does not create that second copy — the plugin
  graph reaches `src/dev/bridge.ts` and nothing else from `src/` — so there is
  one `Container` module in every topology it produces. Moving them needs a
  test that actually loads two copies, which does not exist yet.
- The `Container` constructor used to call `onResize()`, which writes
  `ansiEscapes.clearTerminal` in interactive mode, so every mount wiped the
  screen — including anything `<Static>` had permanently delegated to
  scrollback. Fixed on 2026-08-31 by splitting `onResize()` rather than
  deleting the write: `syncWindowSize()` is the half both callers need
  (measure, publish, schedule) and is what the constructor calls; `onResize()`
  is now only the `'resize'` handler, and keeps the clear. The distinction is
  ownership of what is on screen — a resize has to repaint over its own
  re-wrapped rows, a mount is a guest in a terminal someone else was using.
  ink never clears at mount either, and clears on resize only when the terminal
  got *narrower*; matching that narrowing rule is still open, and would be a
  separate change. Held by `describe('Container construction')` in
  `test/container.test.ts`, three of whose four cases were seen red — two
  against the old constructor, one against the naive fix of deleting the call
  instead of splitting it.
