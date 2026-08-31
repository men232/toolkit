# Testing

`pnpm test` is `vitest run --typecheck`. Green baseline: **1173 tests / 77 files**,
no type errors.

## Test-first, and why it is a hard rule here

Every bug fix on this package's recent history followed the same discipline:
write the test, **run it and watch it fail**, then fix. It is a rule rather than a
preference because this codebase has repeatedly produced tests that passed
against unfixed code:

- An `ErrorBoundary` fix was premised on `@error="fn"` not working in SFC
  templates. The first test written for it **passed on unfixed code** — the
  template compiler already emitted an `onError` prop and the component already
  declared one, so both call styles landed identically. The real gap was
  `@error.once`, which compiles to `onErrorOnce` and only `emit()` resolves. The
  change was right; the stated reason was wrong, and only running the test red
  first surfaced that.
- A `size.test.tsx` parity case for `display=none` once compared `"" === ""` —
  ink renders a hidden `Box` as an empty string on its own, so the assertion
  would have passed regardless of what vue-stdout produced. It was replaced with
  a form that has a visible sibling, keeping the case count and gaining the
  ability to fail.
- The `useWindowSize` re-render hole was proved first with a throwaway probe
  showing a component still painting `#####` after a real resize. The committed
  test asserts on **rendered output**, never on `columns.value`, precisely so it
  cannot pass against a hook that reports the new width while the layout stays
  stale.

The generalisation: **assert on the observable thing** (rendered output, listener
counts, captured stderr), not on the intermediate value the fix happens to
change. And prove the red state, including for a change claimed to be a no-op.

## Where tests live

- **`src/**` — unit tests beside their target.** `src/tree/layout.test.ts`,
  `src/input/parseKeypress.test.ts`, `src/sfc/compiler-options.test.ts`. 21 files.
- **`test/` (singular) — behaviour, integration, and anything cross-cutting.**
  `test/use-focus.test.ts`, `test/container.test.ts`, `test/parity/**`. 50 files.
- **`*.test-d.*` — type-level assertions**, in either tree, run by `--typecheck`
  in the same command. 6 files.

21 + 50 is the 71 files `vitest run` collects; the 6 type-level files are the
rest of the 77 that `pnpm test` reports.

`src/` containing tests is fine here: `build.config.ts` bundles from explicit
entries, so nothing test-shaped reaches `dist/` (verified — `dist/` contains no
`describe(`).

Supporting material under `test/`: `helpers/` (fake stdin/stdout, the ink parity
harness), `fixtures/` (`.vue` components), `setup/` (the raw-mode tripwire).

## The raw-mode tripwire

[`test/setup/no-real-raw-mode.ts`](../../test/setup/no-real-raw-mode.ts) is a
setup file that **throws** whenever a real stream's `setRawMode` is called, from
test code or from `InputSource` or from anywhere else.

It is a tripwire, not a documented convention, and that choice is the point:
`mount()` defaults `stdin` to the real `process.stdin`, `useInput` subscribes on
mount, and a test that then fails before unmounting leaves the developer's shell
with no echo and no line editing until the process exits. Rather than trust every
future test author to remember "always pass a fake stdin", the real call is made
impossible to perform silently. Tests use `createStdin()` from
[`test/helpers/create-stdin.ts`](../../test/helpers/create-stdin.ts).

The consequence: interactive behaviour cannot be covered by the suite at all. It
is checked by hand in the playground, or under an explicitly allocated PTY — see
[gotchas](./gotchas.md#verifying-interactive-behaviour-needs-a-real-pty).

## The playground is under test

`pnpm dev` opens a menu of demo screens (`pnpm dev <name>` for one directly,
`pnpm dev --list` to list them, and that one starts no dev server). They import
the renderer from `src/`, not `dist/`, so an engine change shows up on the next
hot update with no build.

[`test/playground.test.ts`](../../test/playground.test.ts) mounts and unmounts
**every** demo. A demo that throws on mount, or leaks a timer on unmount, fails
the suite rather than waiting to be discovered by whoever opened the playground
to debug something unrelated.

It iterates the registry in `playground/demos.ts`, which attaches components to
the names in `playground/catalog.ts` through a `Record<DemoName, Component>` —
so a catalog entry with no component, or a component with no entry, fails
`pnpm check-types` rather than the suite. Converting or renaming a demo does not
move the test count. That is also why `layout` is kept as `.tsx`
while the rest are SFCs: it is the only thing in the suite that mounts a
JSX-authored component tree on every run, and the demos are otherwise the
package's `.vue` showcase (see
[intent](./intent.md#the-authoring-surface)). Every demo carries visible
mutable state — a counter, a selection index or a timer — so the playground
also serves as the rig for checking that an update reaches the terminal.

## Environment pins

`vitest.config.ts` pins `FORCE_COLOR=3` and `CI`/`CONTINUOUS_INTEGRATION` to
`'false'`. Both are load-bearing and both mirror ink's own suite — see
[technology stack](./technology-stack.md#vitest) for why. A test that needs
different colour or CI behaviour must model it locally (`vi.doMock('is-in-ci')`,
as `test/non-interactive.test.ts` does), never by changing these.

## Comment-only changes

When a change is meant to touch no executable line — a comment prune, a doc
rewrite — verify it mechanically rather than by review: strip comments and blank
lines from both revisions of every changed file and diff the remainder. It should
be empty. This was applied across 44 files during the comment audit and is the
right check for that class of change.
