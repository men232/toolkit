# Technology stack

Why the tools and pins are what they are. Not a manifest — read
[`package.json`](../../package.json) for the list.

## obuild, not tsup

The package builds with [obuild](https://github.com/unjs/obuild) (`pnpm build`,
config in [`build.config.ts`](../../build.config.ts)). It switched from tsup in
commit `d2d1ea0`.

What obuild buys here is that it is rolldown-based and consumes **Rollup plugins
directly**, which is what makes the build able to run `unplugin-vue-jsx/rollup`
over `NewLine.tsx` with this package's own
`isCustomElement` — the same predicate *and now the same plugin*
`vitest.config.ts` uses (`unplugin-vue-jsx/vite`), so the shipped output and the
tested output compile identically rather than merely equivalently.
(`unplugin-vue-jsx` has no rolldown entry of its own; the `/rollup` build is
used for exactly that reason.)

This build step is what lets the host tags be private. `<stdout-box>` and
`<stdout-text>` are resolved to element names here, when the package is built,
so a consumer's own compiler never meets one and never needs to be told about
them.

`src/sfc/hook.ts` is an explicit build entry even though it is absent from
`exports`. `register.ts` loads it *by URL* (`new URL('./hook.mjs', ...)`), so it
must land at a stable path rather than being folded into a hashed chunk.

obuild also rewrites relative import specifiers with extensions on the way out —
which is why a source-only resolution bug can hide from the published package
entirely; see
[gotchas](./gotchas.md#a-duplicated-tsx-hid-an-unresolvable-dynamic-import).

## yoga-layout

Flexbox in the terminal is Yoga's, not hand-rolled, and not a different flexbox
implementation: `yoga-layout` at `~3.2.1` is what **ink 7.1.1 depends on, at the
same range**. Since parity with ink's rendered output is a tested property, the
layout engine cannot be a variable — two flexbox implementations agreeing
byte-for-byte on every case is not something to hope for.

The cost is that Yoga is wasm with manual memory management. Every `DOMElement`
allocates a node in its constructor and only `destroy()` frees it, which is why
`nodeOps.remove` must call `destroy()` and not `remove()`, and why
`DOMTree/DOMNode.ts` carries an unusual density of hazard comments.

## The width/ANSI family is pinned to what ink resolves

These are not "reasonable latest" choices. Each range is the range ink 7.1.1
declares, so both engines resolve the same code:

| dependency | this package | ink 7.1.1 | resolved |
| --- | --- | --- | --- |
| `string-width` | `^8.2.0` | `^8.2.0` | 8.2.1 |
| `widest-line` | `^6.0.0` | `^6.0.0` | 6.0.0 |
| `cli-truncate` | `^6.0.0` | `^6.0.0` | 6.0.0 |
| `slice-ansi` | `^9.0.0` | `^9.0.0` | 9.0.0 |
| `wrap-ansi` | `^10.0.0` | `^10.0.0` | 10.0.0 |
| `@alcalzone/ansi-tokenize` | `^0.3.0` | `^0.3.0` | 0.3.0 |
| `ansi-escapes` | `^7.3.0` | `^7.3.0` | 7.3.0 |
| `chalk` | `^5.6.2` | `^5.6.2` | 5.6.2 |
| `cli-boxes` | `^4.0.1` | `^4.0.1` | 4.0.1 |
| `indent-string` | `^5.0.0` | `^5.0.0` | 5.0.0 |
| `is-in-ci` | `^2.0.0` | `^2.0.0` | 2.0.0 |

**These libraries carry the Unicode tables.** They decide how wide a grapheme is,
where a slice may cut, and how a line wraps. Running an older major than the
oracle means disagreeing with it about emoji, combining marks and ZWJ sequences —
which is precisely what the older set did: before the bump, three checkmark
glyphs each rendered with a spurious extra column (`'✔ x'` where ink writes
`'✔x'`), and a ZWJ family sequence had a sibling written *into the middle of it*,
producing `👨x👩‍👧`. Five of eleven cases in
[`test/parity/glyph-width.test.tsx`](../../test/parity/glyph-width.test.tsx)
failed before and pass after, with no assertion loosened.

The bump changed **no source file**: every new major kept its call signature, and
both call sites were checked against ink's own `build/wrap-text.js` and
`build/output.js` as shape-identical, so `slice-ansi@9`'s grapheme-intact slicing
is shared with the oracle rather than merely coexisting with it.

Not everything is matched. `type-fest` (`^4.27.0` here, `^5.5.0` in ink) and
`signal-exit` (`^4.1.0` here, `^3.0.7` in ink) deliberately differ — neither
affects rendered output. `ansi-styles` is `^6.2.1` against ink's `^6.2.3`, same
major.

## Node `>=22.12.0`

`engines.node` is `">=22.12.0"`. It is **derived, not chosen**, from two
independent floors:

- **The major** comes from the runtime dependencies. `slice-ansi@9` and
  `cli-truncate@6` both declare `>=22`, so the floor was already 22 the moment
  those versions were installed (commit `592f108`, which first declared
  `">=22"`). The field was previously **absent**, so a consumer on Node 18/20
  installed cleanly and then hit a `TypeError` the first time a clipped line was
  sliced — `slice-ansi@9` calls `Array.prototype.toReversed`. (`is-in-ci@2` at
  `>=20` is a third floor and does not move the answer. ink 7.1.1 itself
  declares `>=22`.)
- **The minor** comes from the vite 8 line. `vite@8` declares
  `"node": "^20.19.0 || >=22.12.0"`. Intersected with the `>=22` above,
  the `^20.19.0` branch is unreachable and the `22` branch starts at
  **22.12.0**. (`@vitejs/plugin-vue@6` and `@vitejs/plugin-vue-jsx@5` declared
  the same range and were part of this derivation until the compiler swap
  dropped them from this package; `examples/cli-vite` still has them, and
  `unplugin-vue`'s `>=20.19.0` / `unplugin-vue-jsx`'s `>=16.14.0` are both
  looser, so the answer is unchanged.)

The previous `">=22"` was therefore too loose: it admitted 22.0–22.11, which
those packages reject. Declaring `>=22.12.0` states the restriction; it does
not add one.

`examples/cli-vite` targets `node22.12` in its build config to match. **The
monorepo root still declares `>=18.12.0`** — that is now incoherent with this
package and was left alone deliberately, since raising it is a repository-wide
decision this package does not get to make on its own.

The trade is real and worth stating: supporting Node 18/20 again means rolling
the dependency bump back, and the spurious column beside every checkmark returns.

## Vue 3.5.13, pinned exactly

`vue` and `@vue/compiler-sfc` are dev-pinned at `3.5.13` (not caret) while the
peer range is `^3.5.0`. `@vue/runtime-core` is a hard dependency at `3.5.13` —
the renderer needs it whether or not the consumer's `vue` is present, and it is
what `src/createApp.ts`, `src/vueRenderer.ts` and `src/focus.ts` import from.

The `3.5` floor is not decorative: `src/sfc/hook.ts` depends on Vue ≥ 3.4
behaviour where the *parser*, not the template compiler, fixes each tag's
`tagType` — see [gotchas](./gotchas.md#iscustomelement-must-reach-parse-not-just-templateoptions).

## TypeScript, and the two-pass type check

`check-types` is two `vue-tsc --noEmit` invocations, not one, and not
`vue-tsc --build`:

- `tsconfig.json` covers `src`, `test`, `playground`.
- `tsconfig.node.json` covers `build.config.ts`, `vite.config.ts`,
  `vitest.config.ts`.

It is `vue-tsc` rather than `tsc` because `.vue` files exist (a test fixture, and
consumers' SFCs). It is two passes because `--build` is **structurally
impossible** here: `--build` requires `composite`, a composite project may not
import files outside its own `include`, and both `vite.config.ts` and
`build.config.ts` import from `./src` (TS6307). The `references` entry that used
to be there could never have worked.

Before commit `b04a6ee` the config files were not type-checked at all — a blatant
`const x: number = "s"` in `vite.config.ts` left the old script at exit 0.

**Root `check-types` reports nothing about a package that has no such script.**
It is `pnpm run -r check-types`, and `pnpm -r run` skips a manifest that does not
declare the script rather than failing on it — so "root `check-types` exits 0" is
a statement about the packages that opted in, not about the workspace. Both
examples were invisible to it until commit `c3726c2` gave them one, which is how
they went un-type-checked while looking covered. All 17 workspace manifests
declare it today; an eighteenth added without one re-opens the hole silently.

## TypeScript comes from the catalog

This package uses the workspace's TypeScript. The catalog in
[`pnpm-workspace.yaml`](../../../../pnpm-workspace.yaml) pins `typescript` at
**6.0.3**, and all eighteen manifests take it as `"catalog:"` —
`packages/vue-stdout`, `examples/cli-tsx` and `examples/cli-vite` included.
`vue-tsc` is `^2.2.0` in those three and resolves 2.2.12, peering
`typescript: ">=5.0.0"`; it drives the TypeScript 6 compiler API without
complaint despite trailing it by two majors.

**It was not always so, and the pin it replaced was an accident.** From commit
`6383160` until the move, these three declared the literal
`"typescript": "~5.8.3"` and resolved **5.8.3** while the other fifteen resolved
6.0.3. `6383160` is the same commit that raised the catalog from `~5.8.3` to
`6.0.3`: every other package rode the catalog up, and this one was left holding
the outgoing value, written into its manifest in that same diff. Nothing
explained it — the commit message is "chore(0.4.0): move to obuild and remove
cjs". The hypothesis that `vue-tsc@2.2` could not drive the TypeScript 6
compiler API — its peer range is permissive, so a real incompatibility would be
invisible in the manifest — was tested and did not hold:

- At `6383160` this package had **no `check-types` script**, and `test` was
  `echo todo`. No TypeScript was invoked here at all, so the pin cannot have
  been a reaction to a TS 6 failure.
- `vue-tsc` did not enter this package until commit `c0fc889`, roughly seven
  weeks after the pin.
- Measured: `vue-tsc@2.2.12` driving `typescript@6.0.3` type-checks this package
  clean, both passes, zero errors.

The two examples got the pin by copy in commit `c3726c2`, which brought them
under type checking; it was an agent's work mirroring this package, not a
separate judgment.

**What the move bought.** `typescript@5.8.3` left `pnpm-lock.yaml` entirely, and
`obuild@0.4.37` collapsed from two peer-resolved installs — one bound to
`typescript@5.8.3` and `vue-tsc@2.2.12`, one to `typescript@6.0.3` — down to a
single `obuild@0.4.37(…)(typescript@6.0.3)(vue-tsc@2.2.12(typescript@6.0.3))`
that every importer shares. `vue@3.5.13` collapsed the same way, from two
type-identities to one. That was the same duplication that made the `tsx`
catalog entry necessary ([below](#tsx-is-catalogued)); it had caused no type
error only because nothing carries obuild's types across the boundary.

Nothing had to change to absorb it: no `vue-tsc` upgrade, no source file, no
`tsconfig`. Both `check-types` passes exit 0, both examples exit 0, root
`check-types` and root `build` exit 0, and `vitest run --typecheck` is unchanged
at 848 / 60 with no type errors. (That pair is the measurement taken at the
move, not a current baseline — the suite has since grown to 1173 / 77. What it
records is that the move cost nothing, which is the claim.)

This package is now subject to the checks TypeScript 6 introduced. TS 6 stopped
auto-including `@types/*`, which is what exposed `core`, `context` and `binlog`
— 107 errors — once vitest 4 removed the transitive
`/// <reference types="node" />` they had been leaning on
([above](#vite-8-forced-vitest-4-workspace-wide)). Nothing surfaced here:
`tsconfig.json`, `tsconfig.node.json` and both examples' configs each declare
`"types": ["node"]` explicitly, which is precisely what `core`, `context` and
`binlog` were missing.

Which TypeScript this package takes is a stack judgment, and the register is
[technology stack decisions › The TypeScript pin moves to the catalog](./technology-stack-decisions.md#the-typescript-pin-moves-to-the-catalog).

## `tsx` is catalogued

`tsx` is pinned through `pnpm-workspace.yaml`'s catalog at `^4.22.4`, not
declared per package. `vite@6` declares `tsx` an **optional peer**, so two `tsx`
versions in the tree fork `vite@6.4.3` itself into two nominally distinct type
identities and `Plugin`/`PluginOption` stop being assignable across them ("Two
different types with this name exist, but they are unrelated"). Root
`check-types` failed on exactly that.

`vite@8` still peers `tsx` (at `^4.8.1`), so the catalog is still what holds the
tree to one `tsx` and therefore one vite identity. The pin itself has not needed
to move.

The catalog was chosen over `pnpm dedupe`: dedupe rewrites resolutions
monorepo-wide, while the catalog is this repo's existing idiom (it already pins
`typescript`, `obuild`, `@types/node`, `vitest`) and is targeted. The floor is
`4.22.4` because `packages/app` declares `tsx` in **`peerDependencies`** — it is
published, so the constraint reaches consumers, and an exact pin would have
forced them all onto one version. A caret keeps it exactly as wide as before.

Fixing this exposed a second defect that had been masked by the old `tsx@4.19.2`
copy; see
[gotchas](./gotchas.md#a-duplicated-tsx-hid-an-unresolvable-dynamic-import).

## vite 8 forced vitest 4, workspace-wide

The two versions are locked together by a packaging detail, not a preference:

- `vitest@3.2.4` declares `vite` a **regular dependency**
  (`^5.0.0 || ^6.0.0 || ^7.0.0-0`). Against vite 8 it resolves its own second
  copy — the same "Two different types with this name exist" fork the `tsx`
  catalog already fixed once, plus a real runtime split where the suite would
  run on a different vite than the build.
- `vitest@4.1.11` declares `vite` a **required peer**
  (`^6.0.0 || ^7.0.0 || ^8.0.0`, `peerDependenciesMeta.vite.optional === false`)
  and uses the workspace's copy.

`vitest` is catalogued, and **15** packages consume it as `"vitest": "catalog:"`
(11 of them with real suites), so moving this package to vite 8 moved the whole
workspace to vitest 4. The owner was shown the alternative — un-catalogue
`vitest` for this package alone — and chose to raise the catalog.

That same regular-dependency accident had been supplying something else for
free. `vite/dist/node/index.d.ts` carries `/// <reference types="node" />`, and
TypeScript 6 does **not** auto-include `@types/*`, so vitest 3's bundled vite was
the only thing putting the node globals into the type programs of packages that
never asked for them. Making vite a peer removed it. This package was unaffected
(it declares `vite` directly), but `core`, `context` and `binlog` each needed
`"types": ["node"]` added to say what they had been getting by accident.

`@types/node` is catalogued at `22.12.0` rather than `22.10.5` because `vite@8`
declares it a peer at `^20.19.0 || >=22.12.0` — the same 22.12.0 boundary as the
`engines` floor above.

## vitest

`pnpm test` is `vitest run --typecheck` — type-level assertions (`*.test-d.*`)
run in the same command as behavioural ones. The **1173 tests / 77 files**
baseline is that combined figure; `vitest run` on its own collects **1152 tests /
71 files**, so the type-level layer is 21 assertions across 6 `*.test-d.*` files.
The vitest 3 → 4 migration changed neither number.

One vitest 4 type change is worth knowing: `vi.fn`'s type parameter constraint
widened from `Procedure` to `Procedure | Constructable`. That breaks the
`ReturnType<typeof vi.fn>` idiom for *declaring* a mock's type — `ReturnType`
instantiates at the constraint, and the resulting union has no single call
signature, so the mock stops being assignable to whatever it stands in for. Name
the signature instead (`Mock<(mode: boolean) => FakeStdin>`). The call
`vi.fn()` is unaffected; only the type-level idiom is.

The config shares
`stdoutPlugins()` with `vite.config.ts`, as `playground/vite.config.ts` does, so
`pnpm dev` and `pnpm test` compile the same sources the same way.

Sharing that function makes dev and test agree with **each other**; it does not
by itself make either agree with `pnpm build`, and for a long time neither did.
`unplugin-vue-jsx` declares no `enforce`, so Vite's built-in transform
(`vite:oxc` on vite 8) reached `.tsx` first and compiled the JSX itself, leaving
the Vue JSX plugin a no-op under Vite while the rolldown build used it properly.
`stdoutPlugins()` now pins `enforce: 'pre'`, which is what actually makes the
three paths one pipeline. The full argument, the rejected levers
(`oxc`/`esbuild` filters, `esbuild: false`, `tsconfig.json`) and the measurements
are in
[gotchas](./gotchas.md#dev-and-build-compiled-jsx-with-different-semantics).

Two environment pins are load-bearing and both mirror what ink's own suite does:
`FORCE_COLOR=3`, because vue-stdout and ink each colourise through their own
chalk instance and independent environment detection can make them disagree for
reasons unrelated to layout; and `CI`/`CONTINUOUS_INTEGRATION` pinned to
`'false'`, because `is-in-ci` would otherwise flip every mounted-app test into
non-interactive mode on a CI runner but not on a laptop.

`test.testTransformMode.web` is deliberately **not** set. It works, but the cost
is disproportionate — see
[gotchas](./gotchas.md#testtransformmodeweb-fixes-the-codegen-and-moves-the-whole-graph).

## `vite-node` is gone; `pnpm dev` is the dev server

`pnpm dev` was `vite-node --watch playground/index.tsx --`. It is now
`tsx playground/dev.ts`, a launcher that starts the dev server described in
[architecture](./architecture.md#the-dev-server). `dev:hmr` was folded into it;
there is one dev command.

Two reasons, and the second is the one that made it urgent:

- **`vite-node` is retired upstream.** Its own README says it "has finished its
  mission". It will not be fixed for future Vite majors, and this package is
  already on vite 8.
- **Its `--watch` did not restart on a `.vue` edit.** Measured twice under
  Python `pty.openpty()`, on vite-node@6 / vite 8.2.2, at commit `4f3bd51`:
  with `counter` open, replacing a string in `playground/demos/Counter.vue`
  produced **zero bytes** in a 12-second window. Editing `playground/index.tsx`
  in the same harness *did* restart and repaint, so the watcher was alive — it
  simply never saw the SFCs, which are this package's primary authoring
  surface. Not root-caused; the likely cause is `vite-node@6` patching
  `server.ws.send` against vite 8's channels. So the command this replaces was
  already restarting on nothing for the files anyone actually edits.

Two shapes were rejected. Spawning the `vite` binary as a child process would
put a second TTY-aware process on the terminal, which is the thing
`src/vite/dev.ts` exists to avoid; the launcher calls `createServer().listen()`
in its own process instead, which is all `vite`'s `serve` does beyond
`printUrls()` and `bindCLIShortcuts()` — both already neutralised by the dev
plugin. And routing `--list` through the server was rejected because printing
six names should not be able to fail for a dev server's reasons: it is answered
from `playground/catalog.ts`, which holds the names and blurbs and imports no
component, precisely so plain Node can read it.

The cost of having one dev command is that the config-restart hazard is now on
the default path — see
[architecture](./architecture.md#the-dev-server), and the warning in the README
that a user meets.

## `vite` is an optional peer, for one entry point

`vite` was a devDependency only, and nothing in `src/` imported it, until
`@andrew_l/vue-stdout/dev` — the dev server described in
[architecture](./architecture.md#the-dev-server) — landed. It is now **also an
optional peer** at `^8.0.0`:

- **A peer, not a dependency**, because the plugin has to run inside the
  consumer's own Vite. A second copy would give the plugin a different
  `ViteDevServer` class, a different module runner and a different `HotPayload`
  type from the one actually serving the app, and the failure would look like
  "the plugin does nothing".
- **Optional**, because the renderer does not need it. `dist/index.mjs` and
  `dist/sfc/*` carry no reference to `vite`; only `dist/vite/index.mjs` does,
  and importing that entry without `vite` installed fails, which is the correct
  failure — there is nothing there that works without a dev server.
- **`^8.0.0` rather than an exact patch pin.** vue-tui pins its equivalent to a
  single patch because it reaches into `hmrClient.fetchUpdate` and
  `hotModulesMap`, both `private` in Vite's declarations. This package touches
  no private seam: `isRunnableDevEnvironment`, `server.environments.ssr.hot`,
  `server.ws` and `configureServer`'s post hook are all public API. What *is*
  version-coupled is behaviour rather than types — the module runner's
  re-import of the entry after a full reload, and the entrypoint set it
  computes — and that is recorded in
  [gotchas](./gotchas.md#a-synchronous-throw-in-a-vite-hot-listener-kills-the-process)
  rather than defended by a pin that would not detect it anyway.

`THIRD-PARTY-NOTICES.md` is in `files` for the same entry point: three modules
under `src/vite/` are adapted from vue-tui (MIT, © 2026 Yunfei He), and a
published tarball is a "copy" in the licence's sense. The per-file headers are
for readers of the source; the notices file is what actually carries the
obligation, since `obuild` is free to strip comments.
