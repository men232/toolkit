# Architecture

Five units, stacked. Each one below knows nothing about the one above it.

```
Vue application  (consumer components)
    │  vnodes
    ▼
createApp / nodeOps        src/createApp.ts, src/vueRenderer.ts, src/nodeOps.ts
    │  DOM mutations
    ▼
DOM tree                   src/tree/DOMTree/**
    │  Yoga nodes + attributes
    ▼
layout → paint → Layer     src/tree/layout.ts, src/tree/render.ts, src/tree/Layer.ts
    │  one frame string
    ▼
Container                  src/Container.ts
    │  bytes
    ▼
terminal
```

## The renderer seam: `createVueApp` + `nodeOps`

[`src/vueRenderer.ts`](../../src/vueRenderer.ts) is four lines: `createRenderer`
from `@vue/runtime-core` over [`src/nodeOps.ts`](../../src/nodeOps.ts). That is
the entire Vue integration. Everything below it is a plain synchronous library
that has never heard of Vue.

It exports `createVueApp` — Vue's own `createApp`, bound to a different host.
The public entry point, [`src/createApp.ts`](../../src/createApp.ts), builds on
it (see [the entry point](#the-entry-point-createapp--mount) below);
`renderToString` uses it directly, because a pure string renderer has no
`Container`, no streams and no exit promise to wire.

The seam is where the two lifetimes have to be reconciled, and `nodeOps.remove`
is the place it bites: Vue's unmount path calls `remove`, but every `DOMElement`
allocates a Yoga wasm node in its constructor and `free()` is only reachable
through `destroy()`. Calling `remove()` there leaked one wasm node per unmounted
element, unbounded, on any churning `v-for`. `remove` also has to capture the
root *before* detaching, because detaching nulls it, and then emit the reflow
itself — `insertBefore` emits `DOMChanged`, `remove()` does not.

## The DOM tree

[`src/tree/DOMTree/**`](../../src/tree/DOMTree/) is a minimal DOM: `DOMNode`,
`DOMElement`, `DOMText`, `DOMComment`, `DOMDocument`. `DOMElement` owns a Yoga
node; `DOMDocument` owns one too, because the document *is* the layout root.
The document is deliberately left with Yoga's bare defaults (column, no-wrap) —
that is what a stack of top-level blocks is, and what ink's own root does.

**This tree is not reactive and must not become reactive.** It is the hot path:
Yoga re-measures it every frame. Nothing observes it; the renderer is driven by
a `DOMChanged` event, not by dependency tracking.

`DOMNode.ts` is where the wasm-level traps live — dangling pointers after
`free()`, `getParent()` that never compares by identity, Yoga aborting on
`insertChild` into a measured node. Its comment density is high on purpose.

**Building the tree is a Yoga cost too, and a separate one from painting it.**
A new element takes `initYogaStyles`, not `resetYogaStyles`: on a node fresh out
of `Yoga.Node.create()` the two leave identical state, but the reset gets there
in 57 wasm crossings and the init in 3, because only `flexDirection`, `flexWrap`
and `alignContent` differ from Yoga's own defaults. The full reset still runs on
the first layout pass — `yogaStylesDirty` starts `true` — so nothing is skipped,
only deferred to the one place that also applies the element's real styles.
An append into a list longer than 64 children takes its Yoga index from
`getChildCount()` rather than scanning `childNodes`, which is what stops filling
a long list being O(n²); below that threshold the scan is cheaper than the wasm
crossing and is kept. `test/yoga-call-budget.test.ts` now budgets construction
as well as repaint.

**A node's subtree always shares its root**, and `setRootDocument` stops as soon
as it is handed the value the node already holds. That is what keeps a real
mount linear: Vue assembles a tree **bottom-up** — children into an element,
then the element into its parent — so without the guard every insertion re-walks
everything built below it to write `null` over `null`, which is O(n·depth) for
the mount and again for the unmount. See
[gotchas](./gotchas.md#vue-builds-the-tree-bottom-up-and-every-benchmark-here-builds-it-top-down).

## Layout and paint

Two passes over the same tree, in [`src/tree/`](../../src/tree/):

- [`layout.ts`](../../src/tree/layout.ts) — `computeLayout(root, width)` styles
  and measures. It is also where inheritance rules that have no ink counterpart
  live (`getTextWrapStyle` walks the whole ancestor chain; `measuresOwnText`
  decides which elements measure their own text) and where per-property styles
  are applied via [`utils/applyStyles.ts`](../../src/tree/utils/applyStyles.ts),
  the largest file in the tree and almost entirely per-property TSDoc.
  **Styles are applied only to elements whose attributes changed**, flagged by
  `DOMElement#yogaStylesDirty` at mutation time; measure functions are still
  re-decided for every element every pass, because their input is the squashed
  subtree text rather than the element's own attributes. Applying styles to a
  clean element writes the values it already holds, and doing that per frame
  destroys Yoga's incremental layout — see
  [gotchas](./gotchas.md#resetting-styles-every-frame-throws-away-yogas-layout-cache).
  **The reset that precedes the application is skipped on a node nothing has
  styled yet** (`DOMElement#yogaStylesPristine`): it exists to clear what a
  previous application left behind, and a first application has nothing to
  clear. That is the whole of the first layout pass for a fresh mount, where it
  was 52 wasm crossings per element and 58 – 64 % of the pass — see
  [gotchas](./gotchas.md#a-reset-undoes-a-previous-application-and-the-first-one-has-nothing-to-undo).
- [`render.ts`](../../src/tree/render.ts) — `renderToLayer` paints an
  already-laid-out tree; every coordinate is read back off the Yoga nodes, and
  nothing is allocated or mutated except the last-seen rect of those elements
  that have a `layout`/`resize` subscriber, which is what
  `syncBoundingClientRect` fires those events from. `getBoundingClientRect()`
  itself computes on read (`DOMNode.ts`) and does not depend on this pass.
  `renderToFrame(root, width)` is the two composed, **synchronously**, which is
  what `renderToString()` depends on.

  One paint reads the same element's rect about three times — `paintChildren`
  places it, `paintBox` sizes its border and background, `paintText` insets its
  text — so `getComputedRect`/`getContentRect` **memoise their Yoga reads per
  layout pass** (`DOMNode.ts`). The memo has exactly one invalidation input,
  `calculateLayout` ran, because Yoga's computed values are frozen between
  layout passes; `beginRectFrame()` is called from the one site that runs it,
  *after* the call, and `updateYogaOwnership` clears it separately because a
  replaced Yoga node is not a re-laid-out one. Each call still returns a fresh
  object: these are public API and a shared one would let a caller's
  `rect.width--` corrupt the frame. See
  [gotchas](./gotchas.md#the-invalidation-contract-for-render-caches).

[`Layer.ts`](../../src/tree/Layer.ts) is the paint target: a virtual character
grid that records write/clip operations and resolves them into one frame string.
It is where per-cell column arithmetic happens, and it is the site of the one
known open divergence from ink — see
[ink reference](./ink-reference.md#closed-divergence-column-advance-in-layer).

**`Layer` is where this engine's one structural advantage over ink lives, and it
is now spent.** `Renderer` constructs one `Layer` and reuses it; ink allocates a
fresh `Output` every frame and therefore cannot remember anything between them.
Two caches exploit that, and both are keyed on a **value** rather than on a
frame boundary, which is what makes them safe to hold across frames at all
(see [gotchas](./gotchas.md#the-invalidation-contract-for-render-caches)):

- **`LayerCaches`** memoises `tokenize`/`stringWidth`/`widestLine`, keyed on the
  exact **post-transformer** line. Ink and vue-tui both carry these; ours simply
  outlives the frame. Retention is bounded by rotating two generations — a
  lookup that hits the previous frame's map is promoted into the current one,
  and the rest is released — because an unbounded version measured +2 078 MB
  over 3 000 frames of fresh content.
- **The row memo** reuses a row's serialised string when the row holds exactly
  the cells it held last frame, compared by object identity. That works only
  because the line memo now spans frames (identical text gives the identical
  `StyledChar[]`), every untouched cell is one shared `BLANK_CELL`, and a wide
  glyph's continuation cell is memoised per character. `styledCharsToString` is
  the most expensive thing left in a frame, so a TUI repainting one line of a
  full screen stops paying for the rest.

Together they take a steady repaint from 1.05–1.97× ink to **0.12–0.86×** on
seven of the eight benchmark workloads. `compute()`'s row arrays must therefore
be freshly allocated every frame — the trap is spelled out in the code, because
reusing them makes the identity comparison compare an array with itself.

`Renderer` (in `render.ts`) sits on top: it owns no tree at all — the Yoga nodes
belong to the DOM — only a `Layer` and a scheduler. It listens for `DOMChanged`
and emits `'static'` then `'frame'`, in that order, for the same pass. That
ordering is a load-bearing invariant `Container` relies on and cannot verify.

`<Static>` output is separate by construction: it is painted once by
`collectStaticOutput`/`renderStaticElement` and flushed straight to the terminal,
never through the erase-and-rewrite frame path. The bookkeeping lives in its own
module, [`staticFlush.ts`](../../src/tree/staticFlush.ts), only because
`layout.ts` cannot import `render.ts` without a cycle — five executable lines and
thirty of argument, which is the right ratio for a scheduler race.

[`src/tree/index.ts`](../../src/tree/index.ts) lists its exports one name at a
time rather than `export *`, because the barrel is re-exported from the package
root and a wildcard would make every future internal helper public by accident.

## The entry point: `createApp` + `mount`

[`src/createApp.ts`](../../src/createApp.ts) is the only way to start an app.
It is deliberately thin: `createVueApp` builds the object, and this file
replaces exactly one method on it and adds one.

**The returned object is Vue's.** `use`, `mixin`, `component`, `directive`,
`provide`, `runWithContext`, `onUnmount`, `version` and the whole `config`
object are Vue's own, untouched — a plugin or a global component behaves here
exactly as in a browser app, because it *is* the same code. Only `mount()` is
replaced (its target is a terminal, not an element) and `waitUntilExit()`
added. `StdoutApp` is `Omit<App, 'mount' | fluent methods>` plus hand-written
declarations of those fluent methods, because `Omit` is a mapped type and
resolves the polymorphic `this` they return down to a plain `App` —
`createApp(X).use(p).mount(...)` would stop compiling otherwise.
`test/create-app.test-d.ts` guards both halves of that.

This replaced `render()`, which returned an ink-shaped `Instance` and never
handed the Vue app out at all. `rerender()` went with it: replacing the root
from outside is an ink-ism. `clear()` moved to `useStdout()` — it needs the
live `Container`, so on the app it would be a method that silently did nothing
outside the mount window.

**The exit-promise invariant.** Exit belongs to the *app*; teardown belongs to
a *mount*.

- `exitPromise` is created in `createApp()`, once, and settles at most once,
  for the app. Nothing that merely ends a mount settles it. Creating it here
  is also what makes `waitUntilExit()` legal before `mount()`.
- `teardownMount()` releases everything one mount owns — input, the alternate
  screen, the console patch, the resize listener, Yoga's wasm nodes — and
  never touches the promise.
- `exitApp()` is the only path that settles it, and it is exactly
  `teardownMount()` then `settleExit()`, with the settle in a `finally` so a
  throwing disposer cannot strand a waiter on an already-restored terminal.
  An `exitRequested` latch set *before* teardown makes every entry point
  (`app.unmount()`, `useApp().exit()`, Ctrl+C, `signal-exit`) first-wins.

The split is not stylistic. A dev server with HMR tears a mount down and
builds a new one on every edit; if exit settled in teardown, the first edit
would resolve `waitUntilExit()` and the CLI's `await` would return, closing
the whole Vite server. That work only has to call `teardownMount()` without
`settleExit()`.

**Two refusals**, both of which used to be silent corruption. A module-level
`WeakMap<WriteStream, StdoutApp>` allows one live app per output stream — two
apps painting one terminal interleave erase sequences and cursor moves into
each other's frames, and nothing downstream can detect it. Only a mount that
actually wired a `Container` takes an entry, and its teardown removes it, so a
rejected mount never evicts the owner it collided with. Separately, an app
takes one mount: mounting twice, or mounting past the app's exit, throws.

## `Container`

[`src/Container.ts`](../../src/Container.ts) — the largest single unit, and the
only one that touches the terminal. It **extends `DOMDocument`**: the container
*is* the layout root, not a thing that holds one. It owns:

- the three streams, and `interactive` — resolved once in `mount()` and read
  from here by everything downstream. Non-interactive means no ANSI erase, no
  cursor manipulation, no resize handling, and one write at teardown.
- the `Renderer`, and the frame commit path: `maxFps` throttling (with a
  guaranteed trailing frame), `incrementalRendering`, `debug`, `alternateScreen`.
- terminal state that must be reference-counted or single-owner: raw mode and
  bracketed paste (counted, via `InputSource`), cursor position (single
  last-write-wins slot, no read path), console patching.
- `windowSize` — one `shallowRef`, written only by `Container.syncWindowSize` from the
  same numbers it just gave the layout. This is the *only* `'resize'`
  subscription; see [gotchas](./gotchas.md#per-consumer-stream-listeners-garble-the-frame).

Console patching is deliberately not a wrapper around the `patch-console`
package ink delegates to: the interception has to cooperate with frame height and
`<Static>`, which that package knows nothing about.

## Composables and contexts

[`src/context.ts`](../../src/context.ts) is the single wiring point. It defines
the injection keys (`Stdin`, `Stdout`, `Stderr`, `App`, `Focus`, `Cursor`), the
value shapes, and one `provideStreamContexts(app, container, exit, focusManager)`
called once per mount from `createApp.ts` — inside `mount()`, which is where the
`Container` it wires first exists. New contexts extend that function rather than
adding a second wiring point. Every consumer helper throws a named error when
called outside a mounted app.

[`src/hooks/**`](../../src/hooks/) are thin by design: they inject a context and
`computed` over it. `useWindowSize` is two computeds and no lifecycle at all.
`useDOMElement` is the exception that carries lifecycle, because a component's
root vnode can be *replaced* rather than patched (`v-if` on the root,
`<component :is>`, a changed `key`) and a captured element would report its last
layout forever.

`src/hooks/**` import from `vue`; `src/createApp.ts`, `src/vueRenderer.ts` and
`src/focus.ts` import from `@vue/runtime-core`. That is not inconsistency:
`@vue/runtime-core` is this package's own hard dependency, while `vue` is a peer
the *consumer* supplies — and hooks only ever run inside the consumer's tree,
where the peer exists by definition.

[`src/focus.ts`](../../src/focus.ts) holds `FocusManager`: one registry per
mount, created alongside that mount's `Container` and holding tab order and the
focused id for as long as it lives.
Its state is reactive data (`shallowReactive` registry + `shallowRef` current id)
so the composables *derive* with `computed` instead of subscribing and mirroring.
It was an `EventEmitter` with a hand-written mirror ref in every consumer; that
was the last piece of React residue in the package and it is gone.

Input is [`src/input/**`](../../src/input/): `InputSource` owns the one
`readable` subscription on stdin and the raw-mode reference count, and turns
bytes into `'input'`/`'paste'` events through `inputParser`; `parseKeypress` and
`kitty` decode. It works in strings, not byte chunks, which keeps
`parseKeypress`'s `Uint8Array`-mutation hazard permanently out of reach.

## The SFC and Vite pipeline

[`src/sfc/`](../../src/sfc/) — three entry points, one shared predicate.

- [`compiler-options.ts`](../../src/sfc/compiler-options.ts) is the source of
  truth: `INTRINSIC_TAGS` (`stdout-box`, `stdout-text`) and `isCustomElement`.
  **Private** — not exported from the package or from `/vite`. Every compile
  path *inside this repo* is handed this same function (`build.config.ts`,
  `vite.config.ts`, `hook.ts`), because this package's own sources are what
  name the host tags. A consumer needs none of it. A unit test enforces that
  the set stays a superset of the layout engine's `INLINE_ELEMENT_TAGS`.
- [`hook.ts`](../../src/sfc/hook.ts) + [`register.ts`](../../src/sfc/register.ts)
  — the no-build path: a Node ESM loader hook that parses and compiles `.vue`
  in-process, handing `<script lang="ts">` back to the loader chain (which is why
  `--import tsx` must come *first*). It is an entry in `build.config.ts` even
  though it is absent from `exports`, because `register.ts` loads it by URL and
  it must land at a stable path rather than inside a hashed chunk.
There is deliberately **no Vite module here**, and there is no compiler preset
anywhere in the package. There was one until the tag work landed -
`src/sfc/vite.ts`, published as `@andrew_l/vue-stdout/vite` - and it held two
things, both of which have since evaporated:

- A `vueStdout()` preset, whose only job was constructing `@vitejs/plugin-vue`
  with `isCustomElement` set. With the host tags private there is nothing to
  inject, so a consumer writes `plugins: [vue(), vueJsx()]` with no options,
  exactly as for any other Vue project.
- Two wrappers (`pinClientCodegen`, `forceClientTransform`) that monkey-patched
  a plugin's hooks to keep it emitting client-flavoured code under a host
  driving Vite's SSR transform. This renderer mounts with
  `createApp().mount()` and has no server renderer, so SSR-flavoured codegen
  (`useSSRContext()`, `ssrRegisterHelper()`) throws the moment a component
  mounts - but the fix belonged in plugin *choice*, not in another package's
  hooks. `vite.config.ts` now uses `unplugin-vue` and `unplugin-vue-jsx`, which
  expose client output as a supported option, and the wrappers are gone.

The reasoning behind both patches is preserved in
[gotchas](./gotchas.md#the-vue-plugins-that-needed-patching-and-the-ones-that-do-not),
because the trap is easy to walk back into.

## The dev server

[`src/vite/`](../../src/vite/) is published as
`@andrew_l/vue-stdout/dev` and is the *only* thing in this package that imports
`vite` (an optional peer). It is **not** a compiler preset and must not become
one: it configures no `.vue` or `.tsx` compiler, and it patches no other
plugin's hooks. What it does is run one app.

**One process, not two.** `vueStdoutDev({ entry })` imports the entry into
Vite's runnable `ssr` environment — the dev server's own Node process. A child
process was rejected outright: two TTY-aware processes changing raw mode and
the alternate screen on one terminal, and neither one's screen is what it
computed. `Container.destroy()`'s restoration guarantees all assume a single
owner.

Four moves make that work, and each is a trap somewhere else:

- `server.bindCLIShortcuts = () => {}` — Vite attaches a readline listener to
  `process.stdin`, so a submitted `q` would call `server.close()` out from under
  a raw-mode TUI.
- [`bridge-hmr.ts`](../../src/vite/bridge-hmr.ts) forwards `file-changed` from
  the browser channel onto the runner's, which is
  [the difference between HMR and a restart](./gotchas.md#without-the-file-changed-forwarding-hmr-is-a-fast-full-reload).
- the entry is imported from the **post** hook, un-run. Vite calls what
  `configureServer` returns with `postHooks.forEach(fn => fn())` and discards
  the result, so nothing started there can block `_createServer` — which
  matters because a config edit builds the new server *before* closing the old.
- `server.close` and app exit are cross-wired, in both directions, through
  [`src/dev/bridge.ts`](../../src/dev/bridge.ts).

**The seam into the app** is that bridge, and it is internal: not in `exports`,
not re-exported from `src/index.ts`, inert unless a dev server connects. Its
state lives on `globalThis` because the plugin's copy (resolved by Node) and
the app's copy (transformed by Vite's runner) are two module instances in one
process that have to agree on who owns the terminal.

What the bridge asks of a mount is one asymmetric pair, and the asymmetry *is*
the design — it is the same line
[`createApp`](#the-entry-point-createapp--mount) already draws between exit and
teardown:

- `replace()` ends a **mount**. It is `teardownMount()` and nothing else, so
  the app's exit promise stays pending. Settling it would return from the CLI's
  `await app.waitUntilExit()` and close the dev server on the developer's first
  edit. The replacement mount is not built here: Vite's runner re-imports the
  entry itself after a full reload, and the entry calls `createApp()` again.
- `close()` ends the **app**. It goes through `exitApp()` and hands back the
  exit promise, so the server can wait for the terminal to be restored.

One dev-only component, [`DevRoot`](../../src/dev/DevRoot.ts), wraps the user's
root. It is not an overlay: `__VUE_HMR_RUNTIME__.reload` recreates a component
through `instance.parent.update()`, and a root component has no parent, so
without the wrapper every non-template SFC edit takes Vue's much less exercised
`appContext.reload` path.

Out of scope in the current phase, and listed so their absence reads as a
choice: an error overlay (compile errors fall through to Vite's own output), a
process-wide terminal-ownership registry with a bounded handover for config
restarts, and JSX HMR — `unplugin-vue-jsx` emits no HMR calls at all, so every
`.tsx` edit is a full reload.

The missing registry has a name and a reproducer: **editing the Vite config
while the server runs is undefined behaviour.** Vite restarts on a config
change by building the replacement server before closing the original — the
same ordering the post hook above depends on — so for that window two sessions
each hold a mounted app that believes it owns the terminal. Raw mode, the
cursor and the alternate screen get set twice and restored once, and which
teardown wins is a race. This was tolerable while it was reachable only through
an opt-in `dev:hmr`; since `pnpm dev` *is* the dev server it sits on the default
path, so it is written down where a user meets it — the caveat under
[hot reloading](../../README.md#hot-reloading-in-development) and a note in
`playground/vite.config.ts` itself. Documented, not fixed.

**Launching it.** `pnpm dev` is `tsx playground/dev.ts`, which validates
`pnpm dev <name>` against `playground/catalog.ts`, puts the answer in
`VUE_STDOUT_DEMO` (the entry cannot read `argv` — by then `argv` is the
server's) and then calls `createServer().listen()` in its own process.
`pnpm dev --list` is answered from the catalog and never starts a server. Why
that shape, and what replaced `vite-node`, is in
[technology stack](./technology-stack.md#vite-node-is-gone-pnpm-dev-is-the-dev-server).

## Where the lines sit, and why

- **Vue is confined to three files** (`vueRenderer.ts`, `nodeOps.ts`,
  `createApp.ts`) plus the
  composables. The engine underneath is a synchronous library, which is what
  makes `renderToString()` possible and what makes parity testing against ink
  cheap — both engines are just functions from a tree to a string.
- **`Container` is one unit, not several**, because terminal state is not
  separable: the cursor, the frame height, `<Static>` flushing, console
  interception and the alternate screen all constrain each other's ordering.
  Splitting them would move the coupling into an interface without removing it.
- **Layout and paint are separate passes** because consumers of a computed
  layout are not all painters. `measureElement` reads geometry straight back off
  the Yoga nodes with no paint at all; `<Static>` paints a subtree on a schedule
  entirely unlike the frame's. Fusing the passes would deny both.
- **`src/tree/` knows nothing about terminals.** It produces a string. Deciding
  when to write it, whether to erase first, and whether the session may touch
  the terminal at all belongs to `Container`.
- **The examples live inside this package**, at `examples/cli-tsx` and
  `examples/cli-vite`, because they exist to demonstrate it and nothing else —
  the owner asked for the move in his own words («унеси examples для vue-stdout в
  vue-stdout»). Its provenance, and why that judgment is named but registered
  nowhere, is in the preamble of
  [technology stack decisions](./technology-stack-decisions.md).
  Two consequences are load-bearing and easy to break. They are still **separate
  workspace packages**, matched by a `packages/vue-stdout/examples/*` glob in
  `pnpm-workspace.yaml` that exists only for them — `packages/*` does not match a
  nested package, and without the glob `pnpm run -r` stops visiting them and
  their `workspace:*` link to `@andrew_l/vue-stdout` stops resolving. And they
  are **not published**: `package.json`'s `files` is `["dist",
  "THIRD-PARTY-NOTICES.md"]`, so `npm pack` sees no `examples/` at all. Widening
  `files`, or replacing it with an `.npmignore`, would ship two example trees and
  their dependency closures to every consumer. Prose in this package that names
  `examples/cli-vite` means this directory, relative to the package root.
