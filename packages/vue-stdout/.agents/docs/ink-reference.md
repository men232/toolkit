# ink as a reference

[ink](https://github.com/vadimdemedes/ink) is not a peer this project is
occasionally compared against. It is the model being ported, and it is wired
into the test suite as a **live oracle**.

Pinned version: **ink 7.1.1**, a `devDependency` of this package.

## The oracle, not a transcription

[`test/helpers/parity.ts`](../../test/helpers/parity.ts) renders the *same tree
through both engines* and compares the strings:

```
renderInk(node, columns)  -> ink's renderToString
renderVue(node, columns)  -> our renderToString
expect(vueOutput).toBe(inkOutput)
```

The expected value is **computed from ink at test time**. It cannot be
mis-transcribed, and it tracks the pinned version automatically — bump ink and
every case re-derives its own expectation. Currently **79 tests across 11 files**
under [`test/parity/`](../../test/parity/) — derive it, never edit it by hand;
see [the parity counts](#the-parity-counts-and-where-they-come-from).

Three registration helpers, and the distinction matters:

- `expectParity(name, {}, ink, vue)` — must match byte-for-byte.
- `expectParity(name, { diverges: '4.2#N' }, ink, vue)` — must **differ**, on
  purpose, and snapshot. If we ever converge silently, this fails loudly. The
  `4.2#N` values are opaque identifiers now: they were row numbers in table 4.2
  of the deleted foundation design spec, and each case's actual reasoning is the
  comment above it. Keep the existing two spellings — they are what the counting
  grep matches — rather than renumbering them.
- `expectParityFails(...)` — the **red-case backlog**: a tracked, known
  mismatch. Deliberately *not* `it.fails`, which counts *any* thrown error as an
  expected failure and would let an unrelated crash elsewhere in the pipeline
  masquerade as the documented bug. This asserts the specific shape of failure
  (outputs differ) and lets every other exception propagate as an ordinary red
  test. When the underlying bug is fixed the assertion fails — that is the signal
  to promote the case to `expectParity` and delete the call.

Because this is a real backlog rather than a wish-list, a divergence found and
deliberately not fixed **must be registered**, not just noted in prose.

## The oracle is not only the renderer

The input layer is differentially verified the same way, and that is easy to
miss because `test/parity/` holds only rendered frames.

ink ships `parse-keypress.js` and `input-parser.js` in its build output, next
to `index.js`, but declares **neither in its `exports`**.
[`test/helpers/inkParser.ts`](../../test/helpers/inkParser.ts) reaches them by
resolving `require.resolve('ink')` and walking to the sibling file — not by a
hardcoded `.pnpm` path, which would break the moment the lockfile's content
hash changed. `src/input/parseKeypress.ts` and `src/input/inputParser.ts` are
then compared against ink's own, case by case: **271** keypress cases
(including the lone high-bit byte and double-ESC branches) and **86** chunked
session cases (bracketed paste, reads split mid-sequence, several keys per
read, invalid escapes), with zero divergence. Nothing in either port was
hand-transcribed.

The cost of depending on an undeclared file is accepted deliberately and made
loud rather than defended: the loader throws a message naming ink's build
layout and the file it looked for, so a layout change fails as an explanation
rather than as a resolution error. If ink stops shipping those files, the port
loses its oracle and the cases have to be pinned some other way — do not
quietly replace them with transcribed expectations.

One trap that suite already paid for: `parseKeypress`'s high-bit branch
**mutates its input `Uint8Array` in place**, so handing the same buffer to both
parsers made the second read the first's already-decoded bytes. The differential
harness clones before each call. `InputSource` works in strings rather than byte
chunks, which keeps that hazard out of the engine entirely.

## Consequences for how ink evidence is used

**ink's code and observed output are evidence. ink's documentation is not.**
That is not a stylistic preference; it has been paid for twice on the same
subsystem, and in both cases *our* documentation was wrong because it had been
copied verbatim from ink's:

1. **`disableFocus`.** ink's TSDoc: "Disable focus management for all
   components. *The currently active component (if there's one) will lose its
   focus.*" ink's implementation (`build/components/App.js:389-391`) is
   `setIsFocusEnabled(false)` and nothing else — `activeFocusId` is untouched.
   The port was faithful; the inherited doc was wrong in both projects. Ours now
   describes what actually happens.
2. **`focusPrevious`.** ink's TSDoc: "If there's no active component right now,
   focus will be given to the *first* focusable component." ink's implementation
   (`build/components/App.js:361-363`) is
   `previousFocusableId ?? lastFocusableId` — the **last**. Our `focus.ts` said
   last (correct, matching ink's behaviour) while our `useFocusManager` doc said
   first (copied from ink's wording). Fixed in commit `d76d45e`.

The rule that follows: when ink's docs and ink's code disagree, the code is what
the port matches, and the discrepancy is worth noting rather than silently
resolving. Correspondingly, **do not cite ink source line numbers in comments** —
they rot against a moving upstream. Claims of the form "matches ink" are fine;
the audit trail is the parity suite, which verifies against live ink, not a
transcribed reference.

**The rule has exactly one deliberate exception, and it is recorded so it does
not read as a lapse.** `measureElement` on an element that owns a Yoga node but
has never been through `calculateLayout` reads back Yoga's `NaN` sentinel. ink's
docs promise all-zeros unconditionally; ink's *implementation* does not
special-case it either, so ink returns the `NaN`. Here the documented promise is
matched instead ([`src/measureElement.ts`](../../src/measureElement.ts)
normalises to `0`), because `NaN` is not a behaviour a caller can port against —
it propagates silently through whatever arithmetic they do with the number and
surfaces somewhere else entirely. The distinction that makes this consistent
rather than ad hoc: follow ink's code when the two disagree about *behaviour*,
and ink's docs when ink's code is a *leak* its own docs disclaim.

## Closed divergence: column advance in `Layer`

[`src/tree/Layer.ts`](../../src/tree/Layer.ts) used to advance the write cursor
with:

```ts
const isWideCharacter = character.fullWidth || character.value.length > 1;
// ... clears exactly one following cell, then
offsetX += isWideCharacter ? 2 : 1;
```

ink 7.1.1 (`build/output.js`) uses:

```js
const characterWidth = Math.max(1, this.caches.getStringWidth(character.value));
// ... clears characterWidth - 1 following cells
```

A **narrow multi-code-point grapheme** — a letter plus a combining mark, or any
astral-plane character — was therefore charged 2 columns here and 1 in ink. Two
in a row made the drift visible: ink emitted `áb́x`, we emitted `áx`, having
silently overwritten the second grapheme.

Status: **closed on 2026-08-31.** The owner ruled on it — see
[ink parity decisions › `Layer`'s column advance](./ink-reference-decisions.md#layers-column-advance-for-narrow-multi-code-point-graphemes)
— and ink's rule is now ported, together with the two boundary repairs it needs
and which `Layer` had never had: an overlapping write that *starts* on a wide
glyph's continuation cell blanks the orphaned leading half, and one that *ends*
inside a wide glyph blanks the orphaned trailing half. Both were absent, and the
second is invisible without styling, because an orphaned continuation cell
carries the glyph's own SGR codes.

Held by two parity cases in
[`test/parity/glyph-width.test.tsx`](../../test/parity/glyph-width.test.tsx)
(*"consecutive combining-mark graphemes"*, *"astral-plane letters adjacent to
text"*) and by `describe('Layer column advance')` in
[`src/tree/Layer.test.ts`](../../src/tree/Layer.test.ts), which reaches the
boundary repairs a rendered tree cannot easily reach. Beyond the suite, 20 000
random overlapping-write sequences were compared cell-for-cell against ink's own
`Output` and came back byte-identical.

**What it cost.** Ink's rule measures every character with `string-width` where
the old one read a property, and that is not free on a full screen: the straight
port measured **+13 % median, +25.8 % worst case** against the seven paint
workloads in the frame benchmark. A width table indexed by UTF-16 code unit
(`SINGLE_UNIT_WIDTHS`, `Layer.ts`) brings the same rule to **+4.3 % median,
+8 % worst** — still above the +3 % a 2026-08-30 audit had estimated, which is
worth knowing before the next person quotes that estimate.

## Where ink evidence is *not* the answer

- **API shape.** The composables carry ink's names and behaviour, not React's
  idioms. `enableFocus()`/`disableFocus()` were removed outright in favour of a
  writable `isFocusEnabled` ref, because keeping both shapes defeats the point.
- **Accepted behavioural divergences.** Two are registered as parity cases
  carrying a `diverges` marker — `flexWrap` default on the row axis (`4.2#1`,
  [`test/parity/text.test.tsx`](../../test/parity/text.test.tsx)) and the
  `flexShrink` default (`4.2#2`,
  [`test/parity/flex.test.tsx`](../../test/parity/flex.test.tsx)) — each with its
  reasoning in a comment above the case and its snapshot beside it; the row-axis
  argument and its measurement also live on `restrictWrapToRowAxis` in
  [`src/tree/layout.ts`](../../src/tree/layout.ts). Plus one behavioural
  difference the string-comparison
  suite structurally cannot express: on unmount of the focused component, ink
  resets `activeId` to `undefined` and leaves the app unresponsive to the
  keyboard until the next Tab, with no error to diagnose it by; we move focus to
  the next suitable component instead. That class of "broken and
  undiagnosable" is exactly what this project declines to port. It is guarded by
  `test/use-focus.test.ts`, not by a parity case.
- **Behaviour over time.** `expectParity` compares one rendered frame. Focus
  transitions, input handling, lifecycle and cleanup are not expressible that way,
  and inventing a parity case for them would produce a test that checks nothing.

## The parity counts, and where they come from

There is no parity ledger file. `docs/PARITY.md` — a Russian-language,
per-subproject history of how the numbers moved — was deleted on 2026-08-31 at
the owner's request along with the rest of `packages/vue-stdout/docs/`. **The
suite is the record**: the reasoning for each accepted divergence now lives in a
comment above its own case, which is where a reader looking at the behaviour will
be standing anyway.

Never maintain these counts by hand; derive them, with the same three commands
that ledger used to document:

```sh
pnpm vitest run test/parity                 # denominator + file count
grep -rn "diverges: '" test/parity/*.tsx    # the deliberate divergences
grep -rn 'expectParityFails(' test/parity/  # the red-case backlog
```

On 2026-08-31 that gives **77 matching + 2 deliberate divergences + 0 red = 79,
across 11 files.**

Two ways to get these numbers wrong, both observed:

- Counting `expectParity(` with grep **undercounts by seventeen** — `borders`
  and `glyph-width` register their cases in a loop, so grep returns 62 where the
  runner reports 79. Use the runner for the denominator.
- The divergence grep must include the opening quote. Bare `grep 'diverges:'`
  returns **3**, not 2: one of the two cases carries the word in its *test name*
  (`'flexShrink diverges: bordered boxes overflow …'`), which is prose, not a
  marker. `diverges: '` matches only the options object.
