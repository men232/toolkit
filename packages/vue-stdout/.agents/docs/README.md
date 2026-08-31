# Records map

Records for `@andrew_l/vue-stdout` only. Open the narrowest record that owns the
area you are changing; the rules that must bind every session live in
[`AGENTS.md`](../../AGENTS.md), outside the PCR markers.

Machine-checkable truth lives in types, tests and configs — not here. If a record
and the code disagree, decide which one went stale and fix that side.

## Direction and shape

| When changing | Read | Ownership |
| --- | --- | --- |
| Scope, positioning, whether something is in remit, what the package refuses to be | [Intent](./intent.md) | Authoritative on scope and non-goals. Does not decide implementation. |
| Choosing `.vue` or `.tsx` for a demo, an example, or README material | [Intent › The authoring surface](./intent.md#the-authoring-surface) | SFC is the foundation, JSX supplementary — the owner's emphasis, and what does *not* follow from it. |
| Where a unit belongs, a boundary between `Container` / `src/tree` / composables / SFC pipeline, or whether to split something | [Architecture](./architecture.md) | Owns the units, the dependency direction, and why each line sits where it does. |
| `examples/cli-tsx`, `examples/cli-vite`, the `files` field, or the workspace globs in `pnpm-workspace.yaml` | [Architecture › Where the lines sit](./architecture.md#where-the-lines-sit-and-why) | The examples live inside this package by the owner's word. They stay separate workspace packages via a glob of their own, and stay out of the published tarball via `files`. |

## Engine and rendering

| When changing | Read | Ownership |
| --- | --- | --- |
| Layout, paint, `Layer`, the DOM tree, `<Static>` flushing, or the frame protocol | [Architecture › Layout and paint](./architecture.md#layout-and-paint) and [Architecture › `Container`](./architecture.md#container) | Owns pass separation and terminal ownership. |
| The `maxFps` default, or where the frame throttle sits in the pass | [Technology stack decisions › The shipped `maxFps` default stays 30](./technology-stack-decisions.md#the-shipped-maxfps-default-stays-30) and [Gotchas › Latent hazards](./gotchas.md#latent-hazards-documented-and-deliberately-not-fixed) | 30 is the owner's, and the headroom the throttle reordering bought above it is deliberately unspent. Where the gate sits in the pass was not his call. |
| Whether the owner has ruled on a parity question — read this before the ink reference | [ink parity decisions](./ink-reference-decisions.md) | The decision ledger for ink parity. Only owner-expressed judgments; controller rulings are deliberately absent, and it says which. |
| Anything that changes rendered output, or a comparison with ink | [ink reference](./ink-reference.md) | Defines ink's status as a live oracle and how its evidence may be used, including the one case where ink's docs beat ink's code. |
| `src/input/parseKeypress.ts`, `src/input/inputParser.ts`, or `test/helpers/inkParser.ts` | [ink reference › The oracle is not only the renderer](./ink-reference.md#the-oracle-is-not-only-the-renderer) | The input layer is differentially verified against ink's own compiled parsers, which ink ships but does not export. Do not replace those cases with transcribed expectations. |
| Character-width, grapheme, or ANSI-slicing behaviour | [ink parity decisions › `Layer`'s column advance](./ink-reference-decisions.md#layers-column-advance-for-narrow-multi-code-point-graphemes), [ink reference › Closed divergence](./ink-reference.md#closed-divergence-column-advance-in-layer) and [Technology stack › width/ANSI family](./technology-stack.md#the-widthansi-family-is-pinned-to-what-ink-resolves) | The divergence the owner closed on 2026-08-31, what porting ink's rule cost, and why those dependency pins are not free choices. |
| A divergence from ink you intend to keep | [ink parity decisions › Parity is a floor](./ink-reference-decisions.md#parity-is-a-floor-not-a-transcription), [ink reference](./ink-reference.md#the-oracle-not-a-transcription) and [ink reference › The parity counts](./ink-reference.md#the-parity-counts-and-where-they-come-from) | The owner's licence to keep a better solution, and its limits. A kept divergence must be registered as a parity case carrying a `diverges` marker, with its measurement and reasoning in a comment beside it — never left as prose. The suite under [`test/parity/`](../../test/parity/) is the record of the accepted ones; the counts are derived by command, not maintained by hand. |

## Vue surface

| When changing | Read | Ownership |
| --- | --- | --- |
| A composable, a context, a ref's mutability, or anything reactive | [Architecture › Composables and contexts](./architecture.md#composables-and-contexts) plus the reactivity rules in [`AGENTS.md`](../../AGENTS.md) | Owns `shallowRef`-by-default, read-only-ref-plus-method, and the non-reactive DOM tree. |
| Adding a composable that subscribes to a stream or a global | [Gotchas › Per-consumer stream listeners](./gotchas.md#per-consumer-stream-listeners-garble-the-frame) | One owner, `computed` derivations. This mistake has been made twice. |
| Writing a `<template>` — a demo, a fixture, a README example | [Gotchas › `vue-tsc` passing is not evidence that a template prop arrives](./gotchas.md#vue-tsc-passing-is-not-evidence-that-a-template-prop-arrives) and [Gotchas › Template whitespace is not JSX whitespace](./gotchas.md#template-whitespace-is-not-jsx-whitespace) | Where templates and JSX paint different bytes. `vue-tsc` catches none of it, and approves both forms it used to get wrong. |
| Adding a boolean prop to a catalog component | [Gotchas › The bare boolean attribute](./gotchas.md#the-bare-boolean-attribute--fixed-but-it-needs-feeding) | It must be enrolled in `BOOLEAN_PROP_KEYS`, and its component must route through `castBooleanProps`. Both are test-enforced. |
| Adding a multi-word prop to a catalog component | [Gotchas › The kebab-case prop name](./gotchas.md#the-kebab-case-prop-name--fixed-and-it-needs-feeding-too) | It must be enrolled in `KEBAB_PROP_KEYS`, and its component must route through `camelizeProps` — `Transform`/`Static`/`NewLine` currently need neither only because every prop they take is one word. Test-enforced, at the type level. |

## Build, tooling and dependencies

| When changing | Read | Ownership |
| --- | --- | --- |
| Whether the owner has ruled on a tooling, version or published-surface question — read this before the technology stack | [Technology stack decisions](./technology-stack-decisions.md) | The decision ledger for the stack. Only owner-expressed judgments; derived pins and controller rulings are deliberately absent, and it says which. |
| A dependency version, the Node floor, the catalog, or `build.config.ts` | [Technology stack](./technology-stack.md) | Owns why obuild, why yoga-layout, why the ink-matched pins, and why `>=22.12.0`. |
| The Node floor, or anything that would move it | [Technology stack decisions › The Node floor](./technology-stack-decisions.md#the-node-floor) and [Technology stack › Node `>=22.12.0`](./technology-stack.md#node-22120) | `>=22.12.0` here against the root's `>=18.12.0` — derived, undecided, and awaiting the owner. Not a choice. |
| Breaking a public export, or an entry in `exports` | [Technology stack decisions › Breaking the public API](./technology-stack-decisions.md#breaking-the-public-api-is-allowed-in-service-of-the-architecture) | The owner's licence to break APIs, and the condition it carries. |
| The bundler, or `build.config.ts`'s choice of tool | [Technology stack decisions › The move off tsup to obuild](./technology-stack-decisions.md#the-move-off-tsup-to-obuild) and [Technology stack › obuild, not tsup](./technology-stack.md#obuild-not-tsup) | obuild is the owner's; how it is configured is not. |
| The `vite` or `vitest` version, in this package or the catalog | [Technology stack › vite 8 forced vitest 4](./technology-stack.md#vite-8-forced-vitest-4-workspace-wide) and [Technology stack decisions › Vitest 4 goes in the catalog](./technology-stack-decisions.md#vitest-4-goes-in-the-catalog) | The two move together, the bump reaches all 15 catalog consumers, and it is what stopped leaking node types into other packages. The owner chose the catalog over un-cataloguing this package; the consequences of that bump were not his. |
| `tsconfig*.json` or the `check-types` script | [Technology stack › the two-pass type check](./technology-stack.md#typescript-and-the-two-pass-type-check) | `--build` is structurally impossible here; two passes is the answer, not an oversight. |
| The `typescript` version, or moving this package off the catalog's TypeScript | [Technology stack decisions › The TypeScript pin moves to the catalog](./technology-stack-decisions.md#the-typescript-pin-moves-to-the-catalog) and [Technology stack › TypeScript comes from the catalog](./technology-stack.md#typescript-comes-from-the-catalog) | `"catalog:"` here as everywhere else, resolving 6.0.3. The owner ruled the move; the `~5.8.3` it replaced was an accident, not a choice, and `vue-tsc@2.2` was never the reason. Un-cataloguing again is his call. |
| `src/sfc/register.ts`, `src/sfc/hook.ts`, the `./register` export, or the `tsx` dependency | [Technology stack decisions › Removing the `tsx` register](./technology-stack-decisions.md#removing-the-tsx-register-running-on-vite-alone) | The owner has ruled the register goes and vite alone runs the package. Not yet carried out — the code still ships all of it. |
| `src/sfc/**`, `vite.config.ts`, `vitest.config.ts`, `build.config.ts`'s plugin list, or the choice of Vue compiler | [Architecture › SFC and Vite pipeline](./architecture.md#the-sfc-and-vite-pipeline), [Gotchas › `isCustomElement`](./gotchas.md#iscustomelement-must-reach-parse-not-just-templateoptions), [Gotchas › the Vue plugins that needed patching](./gotchas.md#the-vue-plugins-that-needed-patching-and-the-ones-that-do-not) | Bring-your-own-compiler, the SSR-codegen problem, why this package compiles with `unplugin-*` rather than the `@vitejs` pair, and the rejected config alternatives. |
| Plugin **order** in `vite.config.ts`, or any claim about how `.tsx` compiles under dev or test | [Gotchas › Dev and build compiled JSX with different semantics](./gotchas.md#dev-and-build-compiled-jsx-with-different-semantics) | `enforce: 'pre'` on the JSX plugin is load-bearing: without it Vite's own transform claims `.tsx` first and `@vue/babel-plugin-jsx` never runs. A green suite is not evidence about JSX semantics. |
| Reintroducing a shipped compiler preset or a wrapper around another plugin's hooks | [Technology stack decisions › The `/vite` entry point goes](./technology-stack-decisions.md#the-vite-entry-point-goes) plus the prohibition in [`AGENTS.md`](../../AGENTS.md) | The owner authorised deleting `@andrew_l/vue-stdout/vite`; what replaced it was not his call. The ruling is about presets and monkey-patches, not about every possible entry point — `./dev` ships and is neither. |
| `src/vite/**`, `src/dev/**`, the `./dev` export, `playground/vite.config.ts`, or anything about HMR | [Architecture › The dev server](./architecture.md#the-dev-server), [Gotchas › the `file-changed` forwarding](./gotchas.md#without-the-file-changed-forwarding-hmr-is-a-fast-full-reload), [Gotchas › a synchronous throw in a Vite hot listener](./gotchas.md#a-synchronous-throw-in-a-vite-hot-listener-kills-the-process) | One process, an internal `globalThis` seam, and the `replace()`/`close()` asymmetry that keeps a reload from closing the dev server. The two gotchas are the traps that make a broken version look like a working one. Editing the Vite config while it runs is undefined behaviour — documented, not fixed. |
| The `dev` script, `playground/dev.ts`, `playground/catalog.ts`, or how a demo is selected | [Technology stack › `vite-node` is gone](./technology-stack.md#vite-node-is-gone-pnpm-dev-is-the-dev-server) and [Architecture › The dev server](./architecture.md#the-dev-server) | One dev command, and it is the dev server. `--list` deliberately answers from the catalog with no server; the demo name travels in `VUE_STDOUT_DEMO` because `argv` belongs to `vite`. |
| A host tag, `INTRINSIC_TAGS`, `INLINE_ELEMENT_TAGS`, or anything that would export one of them | [Intent › Non-goals](./intent.md#non-goals), [Architecture › SFC and Vite pipeline](./architecture.md#the-sfc-and-vite-pipeline) | Two tags, both private, both prefixed. Publishing them is what once forced every consumer to configure a compiler. |
| A `{@link}` in any TSDoc block on a public export | [Gotchas › `{@link}` to a private symbol](./gotchas.md#a-link-to-a-private-symbol-ships-silently) | Verify against the built `.d.mts`, not the source. |

## Tests

| When changing | Read | Ownership |
| --- | --- | --- |
| Where a test goes, what it may assert, or the parity helpers | [Testing](./testing.md) | Owns the `src/` vs `test/` split, test-first discipline, and the environment pins. |
| Anything touching raw mode, stdin, or the real terminal | [Testing › The raw-mode tripwire](./testing.md#the-raw-mode-tripwire) and [Gotchas › real PTY](./gotchas.md#verifying-interactive-behaviour-needs-a-real-pty) | The suite structurally cannot cover interactive behaviour; know where it is covered instead. |
| A change claimed to touch no executable line | [Testing › Comment-only changes](./testing.md#comment-only-changes) | Verify mechanically, not by review. |

## Everything already paid for

| When changing | Read | Ownership |
| --- | --- | --- |
| Anything, before assuming a surprising behaviour is new | [Gotchas](./gotchas.md) | Traps with their reasons, plus the latent hazards that are documented and deliberately unfixed. |

---

`packages/vue-stdout/docs/` is gone. It held the Russian-language parity ledger
(`PARITY.md`), four subproject ledgers and the subproject plans and specs — a
history of how this package got built — and the owner had all of it deleted on
2026-08-31, together with `CHANGELOG.md`. Nothing routes there any more, and
these records are the only standing prose. Where that history carried evidence a
record depended on, the evidence was transcribed into the record before the
delete; the parity measurements now live in the suite itself, under
[`test/parity/`](../../test/parity/).

Update this map whenever a routed file or heading is added, renamed, merged, or
removed.
