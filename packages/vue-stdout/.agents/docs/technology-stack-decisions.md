# Technology stack decisions

Judgments the repository owner actually expressed about this package's tools,
bundler, versions and published surface — what may be broken, what moves
workspace-wide, and what is still unanswered.

**The register contract: only judgments the owner actually expressed enter.** A
finished implementation, a passed review, a green measurement, or silence is not
acceptance. Never invent a rationale — where the owner gave no reason, the entry
says so. Entries record the act of judgment, not the content of the thing judged:
[technology stack](./technology-stack.md) holds the derivations, the pins and the
measurements, and [`package.json`](../../package.json) holds the versions
themselves. Edit entries in place; git keeps history.

**Why this file exists.** The owner authorised opening it on 2026-08-30, writing
«открой technology-stack-decisions.md». That authorisation is the only reason
this file may exist — a ledger is never self-opened. The instruction arrived in
an untracked session directory, so this paragraph is its durable record.

**Several of these were made by picking an option I wrote.** Where an entry says
so, the owner selected one option from a multiple-choice question composed by an
AI controller. The labels and the descriptions in those options were **the
controller's words, not his**; what he expressed is the *selection*. No such
entry's **Why:** presents a controller-authored option description as the
owner's reasoning, and where he offered no reason of his own, the entry says
exactly that. One of those labels also carried a wrong number; the entry that
depends on it records both the label and the correction.

**What is deliberately absent.** Almost everything in
[technology stack](./technology-stack.md) is either *derived* — forced by a
dependency's own declared range, with no judgment to make — or was ruled by an AI
controller coordinating the work, and none of it is entered here however settled
it is in practice. Derived, not decided: the `yoga-layout` range, the whole
width/ANSI pin table, the `>=22.12.0` floor's arithmetic, the `@types/node`
catalog move to 22.12.0, and vitest 4 itself, which vite 8 forces regardless of
where it is declared. Controller rulings, not the owner's: keeping
`forceClientTransform` over `test.testTransformMode.web`, fixing the duplicated
`tsx` through the workspace catalog rather than `pnpm dedupe`, declaring
`engines` rather than rolling the dependency bump back, adding `"types":
["node"]` to `core`, `context` and `binlog`, narrowing `unplugin-vue-jsx`'s
`include` to `/\.[jt]sx$/`, the two-pass `check-types`, the exact `vue@3.5.13`
dev pin, keeping `examples/cli-vite` on the stock `@vitejs` plugins, and every
task-ordering decision in the 2026-08-30 pass. Two standing rules that read like
they belong here are absent because a stronger durable form already holds them:
**"commits carry no agent attribution"** and **"prefer promise chains over
`async`/`await`"** both live in [`AGENTS.md`](../../AGENTS.md) outside the PCR
markers, which is where PCR puts rules that must bind every session; duplicating
them here would create a second place to go stale. Parity judgments have their
own register in [ink parity decisions](./ink-reference-decisions.md) and are not
repeated here. A version that is installed, or a tool that is in use, is evidence
of an implementation — not of an owner judgment about it.

**One owner judgment is absent because it is off-topic, not because it is
missing.** The same 2026-08-30 list that gave us
[removing the `tsx` register](#removing-the-tsx-register-running-on-vite-alone)
also asked, in his own words, «унеси examples для vue-stdout в vue-stdout» —
move the examples for vue-stdout into vue-stdout. That is a judgment, and it was
expressed; it is simply not a stack judgment. This file is scoped to *tools,
bundler, versions and published surface*, and where `examples/cli-tsx` and
`examples/cli-vite` sit in the repository is none of those — it is repository
layout, whose derived document is [architecture](./architecture.md). There is no
`architecture-decisions.md`, and only the owner may open a ledger, so the
judgment is recorded nowhere as a register entry; it is named as deferred and not
rejected in the limits of
[the scope of the 2026-08-30 pass](#the-scope-of-the-2026-08-30-pass). If it
should be registered, the owner opening an architecture ledger is the way, not
stretching this one. **The move has since been carried out** — both examples now
live in [`examples/`](../../examples) beside this package's `src/`, and
[`pnpm-workspace.yaml`](../../../../pnpm-workspace.yaml) matches them there —
which changes nothing about the paragraph above: the work landing is not the
judgment being registered, and this file is still the wrong register for it.

## Decided

### Breaking the public API is allowed in service of the architecture

- **Ruling:** You may break any public API of this package when the architecture
  calls for it.
- **Limits:** The licence is conditional, and the condition is the architecture —
  it does not cover breaking an API for convenience, for tidiness, or to reach a
  closer resemblance to ink. It licenses the break; it says nothing about what a
  consumer is owed when one lands, so it neither requires nor excuses the `!`
  commit markers the breaks in `9166168..3c36695` carry. (Those breaks also
  carried `CHANGELOG.md` entries; the owner had the changelog deleted on
  2026-08-31, which changes what a consumer is told and not what this ruling
  licenses.) It is about *this* package's surface, not other
  workspace packages'. It would be reopened by the owner declaring the package
  stable, or by his objecting to a specific break.
- **Why:** The condition in the utterance is the whole of the reason he offered —
  «можешь ломать любой api в угоду архитектуры», you may break any API in service
  of the architecture. He argued no further, and nothing more is reconstructed
  here. The premise recorded alongside it in the design spec, «Пакет на 0.x» —
  the package is on 0.x — is the spec author's justification, not verified as the
  owner's.
- **Source:** The owner, during the ink-parity subproject work, before
  2026-08-30. It was attributed in decision row 8 of the foundation design spec
  (`docs/specs/2026-08-28-ink-parity-foundation-design.md`), section «4. Принятые
  решения», which read in full:

  > | 8 | Ломать текущий публичный API можно | Пакет на 0.x; подтверждено
  > владельцем |

  — "breaking the current public API is allowed", justified as «Пакет на 0.x;
  подтверждено владельцем», *the package is on 0.x; confirmed by the owner*.
  That spec was deleted on 2026-08-31 at the owner's request, along with the rest
  of `packages/vue-stdout/docs/`, and it existed only on the `feat/ink-parity`
  branch, which was squashed — so no commit anywhere still contains it and git
  history does not preserve it either. The row is therefore transcribed above
  rather than linked. **This entry is now the whole of the record**: the
  utterance itself was in an untracked session directory, and the committed row
  that used to corroborate it is gone. What it rests on is this transcription
  plus the owner's own wording quoted under **Why**.

### The move off tsup to obuild

- **Ruling:** This package's build is obuild's, and the move off tsup was the
  owner's to start.
- **Limits:** It selects the bundler and nothing else. Every detail of how the
  build is configured — [`build.config.ts`](../../build.config.ts), the explicit
  entry list, `src/sfc/hook.ts` being an entry despite its absence from
  `exports`, running `unplugin-vue-jsx/rollup` — is an agent's work and is not
  covered. He ruled *against* nothing: tsup was not declared wrong, and nothing
  here forbids a later bundler. Reopened by the owner asking for a different one.
- **Why:** No reason given. He asked «можем ли мы сделать сборку на базе
  obuild ?» — can we base the build on obuild? — and offered none. The argument
  now in [technology stack › obuild, not tsup](./technology-stack.md#obuild-not-tsup),
  that obuild is rolldown-based and consumes Rollup plugins directly so the JSX
  transform can run with this package's own `isCustomElement`, was found by the
  work afterwards; it is not his reasoning. This entry is filed on the reading
  that naming a bundler and asking for the build to move to it *is* selecting it;
  what is missing is the reason, not the selection.
- **Source:** The owner, before 2026-08-30, in an untracked session exchange.
  Carried out in commit `d2d1ea0`, "switch from tsup to obuild", whose message
  records that vue-stdout was the last package in the workspace still on tsup —
  the rest moved in `6383160`.

### Vitest 4 goes in the catalog

- **Ruling:** Raise `vitest` in the workspace catalog, moving every package that
  consumes `"vitest": "catalog:"`, rather than un-catalogue `vitest` for this
  package alone.
- **Limits:** It settles *where* the version lands, not the version — vite 8
  forces vitest 4 either way, because `vitest@3.2.4` takes `vite` as a regular
  dependency and would resolve a second copy; see
  [technology stack › vite 8 forced vitest 4](./technology-stack.md#vite-8-forced-vitest-4-workspace-wide).
  The two options put to him were catalog-wide versus this package alone, and
  nothing else. It does not accept what fell out of the bump: the `"types":
  ["node"]` additions to `core`, `context` and `binlog`, and the `@types/node`
  catalog move, were the controller's calls made under it. It is also not a
  claim that the bump is verified everywhere — four of the fifteen consumers
  (`dom`, `graceful`, `ioc`, `pino-pretty`) carry vitest 4 with no suite to run.
  Reopened by a catalog consumer being unable to run vitest 4.
- **Why:** No reason of his own. He picked one of two options composed by an AI
  controller; the labels and their descriptions were the controller's words, and
  the selection is the whole of what he expressed. Nothing is reconstructed from
  the label. **The label he picked was also wrong on a fact**: it read «Поднять
  каталог — все 13 пакетов на vitest 4», and the true count is **15** —
  `mongo-pagination` was missing from the list shown to him. The judgment is read
  as its operative clause, "raise the catalog"; the count was the controller's
  and was scenery.
- **Source:** The owner, 2026-08-30, answering a multiple-choice question in an
  untracked session exchange. Durable state: `'vitest': ^4.1.11` in
  [`pnpm-workspace.yaml`](../../../../pnpm-workspace.yaml), and fifteen
  `"vitest": "catalog:"` declarations across `packages/*/package.json`. Landed in
  commit `9166168`.

### The scope of the 2026-08-30 pass

- **Ruling:** That pass is the vite 8 migration, plus the plugin restructuring,
  plus `isCustomElement` — neither the narrower option nor the broader one.
- **Limits:** It scoped one pass, and the pass is finished (`9166168..3c36695`),
  so the ruling is spent as an instruction. What it still does is negative and
  durable: it ruled *nothing* about the work it excluded. The `src/tree`
  architecture audit, removing the `tsx` register in favour of vite alone, and
  moving `examples/` into this package were **deferred, not rejected**; do not
  cite this entry as the owner having declined any of them.
- **Why:** No reason of his own. He picked one of three options composed by an AI
  controller — a narrower and a broader flanked the one he took — and the labels
  were the controller's words. The selection is all he expressed.
- **Source:** The owner, 2026-08-30, in the same untracked exchange as the vitest
  choice, choosing the option labelled «Vite 8 плюс плагин и isCustomElement».
  What the pass actually did is the commit range `9166168..3c36695`.

### The `/vite` entry point goes

- **Ruling:** Delete `src/sfc/vite.ts`, including the published
  `@andrew_l/vue-stdout/vite` entry point, and unify this package's own
  compilation on `unplugin-vue` and `unplugin-vue-jsx`.
- **Limits:** It authorised removing the entry point and the monkey-patch helpers
  it exported. It did not rule on what replaced them — the plugin list in
  [`vite.config.ts`](../../vite.config.ts) and the `include` narrowing are the
  implementer's. It does not touch `@andrew_l/vue-stdout/register`, which still
  ships. Reopened by the owner wanting a shipped Vite **preset** again.

  **The package ships a Vite entry point again, and this entry does not
  prohibit it.** `@andrew_l/vue-stdout/dev` (`src/vite/**`) is a dev server
  that runs one app in Vite's own process with HMR. What this ruling deleted was
  a *compiler preset* plus `pinClientCodegen`/`forceClientTransform`, two
  wrappers around another plugin's hooks — and the reason it could go was that
  choosing `unplugin-*` made the preset unnecessary. None of that applies to a
  dev server: it configures no compiler and patches no plugin, and there is no
  arrangement of plugin choices that makes it unnecessary. So the standing
  prohibition, restated in [`AGENTS.md`](../../AGENTS.md), is on **presets and
  hook wrappers**, not on the `/vite` path as a name. It is spelled `./dev`
  rather than `./vite` deliberately, so the deleted thing and the new one cannot
  be confused for each other at the import site.

  **No owner judgment about the dev server is recorded, and this is not one.**
  The work was directed as an implementation task; that is not the owner
  expressing a judgment about the published surface, and this register only
  takes judgments he actually expressed. If the `./dev` export should be
  registered as a decision, he has to make it — the entry above stays scoped to
  what he did rule on. The measurements behind the preset removal remain in
  [gotchas](./gotchas.md#the-vue-plugins-that-needed-patching-and-the-ones-that-do-not);
  the dev server's own design and traps are in
  [architecture](./architecture.md#the-dev-server).
- **Why:** No reason given — a bare «да» to the proposal. The measurement the
  proposal rested on (a fully green run with `unplugin-vue-jsx/vite` and no
  wrapper of any kind) and the caveat that it covered only the JSX half were both
  the controller's; neither is his reasoning.
- **Source:** The owner, 2026-08-30, answering «да» to «Убираем
  `src/sfc/vite.ts`?» in an untracked session exchange. Carried out in commits
  `62b5396`, `6f6dfbb`, `acc5a99`, `3c36695`. Durable state: `exports` in
  [`package.json`](../../package.json) is `.` and `./register` only, and
  `src/sfc/` holds `compiler-options.ts`, `hook.ts` and `register.ts`; `exports`
  has since grown `./dev`, which is the dev server described in the limits and
  not a return of the preset.

### Removing the `tsx` register, running on vite alone

- **Ruling:** The `tsx` register comes out of this project, and vite alone runs
  it.
- **Limits:** **Nothing has been done about it yet, and the entry records the
  judgment rather than a state of the code.** As of commit `02b793e` the whole
  register path still ships: [`src/sfc/register.ts`](../../src/sfc/register.ts),
  [`src/sfc/hook.ts`](../../src/sfc/hook.ts), the `./register` entry in
  [`package.json`](../../package.json)'s `exports`, and `"tsx": "catalog:"` in
  its `devDependencies`. A ruling whose implementation is pending is a normal
  state; do not read the code's current shape as disagreement with it, and do
  not read this entry as a claim the work happened. What it does **not** govern:
  what a consumer of `@andrew_l/vue-stdout/register` is owed when the entry point
  goes — [breaking the public API](#breaking-the-public-api-is-allowed-in-service-of-the-architecture)
  licenses the break but says nothing about the migration; `examples/cli-tsx`,
  which exists to document exactly this path (`node --import tsx --import
  @andrew_l/vue-stdout/register src/main.ts`) and would have to become something
  else or go; and `tsx` anywhere outside this package — `packages/app` publishes
  it as a `peerDependency`, so the workspace keeps `tsx` regardless. It also does
  not touch the `tsx` **catalog entry**, which exists for an unrelated reason
  (vite declares `tsx` an optional peer, and two copies fork vite's type
  identity — see
  [technology stack › `tsx` is catalogued](./technology-stack.md#tsx-is-catalogued)).
  Reopened by the owner asking for the register back, or by an authoring path
  that vite cannot serve.
- **Why:** No reason given. It arrived as one line in a bulleted list of
  architecture work he wanted, with no argument attached and none requested.
  Nothing is reconstructed here — in particular, the convenience of a single
  compile path is *not* recorded as his reasoning, because he did not say it.
- **Source:** The owner, 2026-08-30, in his own words in the working session:
  «удаление tsx регистра из нашего проекта и запуск только vite» — removal of the
  tsx register from our project and running only vite. The message was a bulleted
  list of architecture work and lived in an untracked session directory, so this
  entry is its durable record. The same item is named in the limits of
  [the scope of the 2026-08-30 pass](#the-scope-of-the-2026-08-30-pass) as
  deferred and not rejected; the two are consistent — that pass excluded the
  work, this entry is the judgment to do it.

### The TypeScript pin moves to the catalog

- **Ruling:** [`packages/vue-stdout`](../../package.json),
  [`examples/cli-tsx`](../../examples/cli-tsx/package.json) and
  [`examples/cli-vite`](../../examples/cli-vite/package.json) declare
  `"typescript": "catalog:"` like the other fifteen manifests, instead of the
  `"~5.8.3"` they each inlined.
- **Limits:** It settles *where the version comes from*, not what the version
  is. The catalog's **6.0.3** is a workspace-wide pin these three now follow,
  and this entry neither accepts nor objects to any later catalog move — a
  future TypeScript is a fresh question for whoever owns the catalog. It rules
  on `typescript` alone: `vue-tsc` stays declared `^2.2.0` per package and was
  not touched, no other inlined pin in these three manifests is covered, and
  editing [`pnpm-workspace.yaml`](../../../../pnpm-workspace.yaml) was not
  proposed to him and is not licensed here. It does not accept anything that
  fell out of the move; nothing did, because nothing else had to change.
  Reopened by the owner asking for a pin of this package's own, or by a catalog
  TypeScript this package cannot type-check against.
- **Why:** No reason given — a bare «да» to the proposal. The proposal he
  assented to rested on a measurement, taken against commit `02b793e` in a
  throwaway worktree, that the move costs nothing; that measurement was the
  controller's grounds for asking and is not his reasoning. Nothing is
  reconstructed here — in particular, neither the duplication the move removes
  nor the TypeScript 6 checks this package now meets is recorded as his
  argument, because he offered none. He ruled *against* nothing: the `~5.8.3`
  pin was not declared wrong, only replaced.
- **Source:** The owner, 2026-08-30, answering «да» in an untracked session
  exchange, which is why this entry is its durable record. Landed on
  `feat/ink-parity` together with this entry. Durable state: `"typescript":
  "catalog:"` in all three manifests, and a single `typescript@6.0.3` with a
  single `obuild@0.4.37` snapshot in `pnpm-lock.yaml`. The derivation, the
  history of the pin and the measurements are in
  [technology stack › TypeScript comes from the catalog](./technology-stack.md#typescript-comes-from-the-catalog).

### The shipped `maxFps` default stays 30

- **Ruling:** Leave the shipped `maxFps` default at **30**; do not raise it.
- **Limits:** It rules on the *default* and on nothing else. A consumer passing
  `maxFps: 60`, or `maxFps: 0` for unlimited, is untouched — the ruling is what
  this package ships when nobody asks, not a ceiling on what anybody may ask
  for. It does not rule on the throttle's *position* in the frame pass: moving
  the `maxFps` gate ahead of layout+paint (commit `913ca5e`) was the
  controller's work, and this entry neither ratifies nor questions it. It is
  registered here as a published-surface judgment, not a tooling one.

  **What it deliberately does not spend.** The reordering left the engine with
  real headroom — at the time he was asked, `maxFps: 60` and `maxFps: 120` both
  cost at or below what `maxFps: 30` had cost before it — and the ruling
  declines to spend any of it on the default. That is a choice he made with the
  numbers in front of him, not an oversight nobody got round to; do not raise
  the default by citing that headroom, and do not file the gap between the
  headroom and the default as a regression. The throttle's own hazards are in
  [gotchas › latent hazards](./gotchas.md#latent-hazards-documented-and-deliberately-not-fixed).

  Reopened by the owner naming a different default, or by evidence that 30 is
  too low for a shipped use case — a demonstrated defect at the default, not a
  fresh cost measurement. The cost argument is spent: he was shown it and
  declined.
- **Why:** No reason given. He answered «оставь 30» — leave it at 30 — and
  offered no argument. Nothing is reconstructed here: the CPU measurement the
  question rested on is the controller's grounds for asking, not his reasoning,
  and neither "30 Hz is enough for a terminal" nor any battery, latency or
  compatibility argument is recorded as his, because he made none. He ruled
  *against* nothing — 60 was not declared wrong, only not adopted.
- **Source:** The owner, 2026-08-31, answering «оставь 30» in an untracked
  session exchange, which is why this entry is its durable record. He was asked
  whether to raise the shipped default on the grounds of a measurement taken
  after the throttle reordering: `maxFps: 60` costing **22.9 % of one core**
  where `maxFps: 30` had cost **34.0 %** before that work, with 60 and 120 both
  at or below the old default's cost. Those figures were the controller's and
  were measured in an untracked session; the adjacent committed measurement is
  in the message of commit `913ca5e` ("whole-process CPU 38.8% -> 22.9% of one
  core", at `maxFps: 30`). Durable state: `maxFps: resolved.maxFps ?? 30` in
  [`src/createApp.ts`](../../src/createApp.ts).

## Open

### The Node floor

[`packages/vue-stdout/package.json`](../../package.json) declares
`"engines": { "node": ">=22.12.0" }`. The monorepo root still declares
`"node": ">=18.12.0"`. The two are incoherent, and the incoherence sits on an
unanswered question.

**How the floor got here is derived, not chosen.** The width/ANSI bump put the
major at 22 (`slice-ansi@9` and `cli-truncate@6` each declare `>=22`), and the
vite 8 line tightened the minor to 22.12.0; the arithmetic is in
[technology stack › Node `>=22.12.0`](./technology-stack.md#node-22120). What is
undecided is the prior question the arithmetic cannot answer: whether this
package is *allowed* to require Node 22 at all. **The current floor is therefore
not a choice.** The owner was told plainly — «если Node 18/20 обязателен —
скажите: тогда откат подъёма зависимостей», if Node 18/20 is required, say so and
the dependency bump is rolled back — and has not answered. Silence is not
acceptance.

**Stopgap:** declaring the floor rather than rolling the bump back (commit
`592f108`, tightened by the vite 8 pass). A Node 18/20 consumer now gets an
`EBADENGINE` warning at install time instead of a `TypeError` from
`Array.prototype.toReversed` the first time a clipped line is sliced. It is a
warning and not a gate — this repository has no `.npmrc` anywhere and
`engine-strict` is unset. `examples/cli-vite` builds with `target: 'node22.12'`
to match.

**Cost of leaving it:** the package cannot be used below Node 22.12 while the
root manifest still advertises `>=18.12.0` to anyone reading the repository, so
the workspace states two different answers about the same code.

**What would settle it:** the owner saying whether Node 18/20 support is
required. If it is, the width/ANSI bump comes out and the spurious column beside
every checkmark glyph returns. If it is not, one question remains and it is not
this package's to decide — whether the root's `>=18.12.0` is raised, which is a
repository-wide call across fifteen otherwise unrelated packages.
