# ink parity decisions

Judgments the repository owner actually expressed about what parity with ink is
*for* — what may be kept, what must converge, and what is still unanswered.

**The register contract: only judgments the owner actually expressed enter.** A
finished implementation, a passed review, resemblance to ink, or silence is not
acceptance. Never invent a rationale — where the owner gave no reason, the entry
says so. Entries record the act of judgment, not the content of the thing judged:
[ink reference](./ink-reference.md) holds the working rules and the oracle
mechanism, and the parity suite under [`test/parity/`](../../test/parity/) is the
measurement — each accepted divergence is a registered case carrying its own
`diverges` marker and its reasoning in a comment beside it. Edit entries in
place; git keeps history.

**Why this file exists.** The owner authorised opening it on 2026-08-30,
answering «да» to a proposal that the ink-parity judgments be registered
separately from the measurement log. That authorisation is the only reason this
file may exist — a ledger is never self-opened. The proposal lived in an
untracked session directory, so this paragraph is its durable record.

**What is deliberately absent.** Most of what reads like a parity decision in
this project's history was ruled by an AI controller coordinating the work, not
by the owner, and none of it is entered here however settled it is in practice:
narrowing the `flexWrap` default to the row axis (the now-deleted
`docs/PARITY.md` recorded it against commit `bd828bb` as «координатор велел
сузить наш дефолт `flexWrap: WRAP` до row-оси» — *the coordinator ordered* the
narrowing; that attribution is transcribed here because it is the only thing
distinguishing this from an owner ruling, and its file is gone), the
`flexShrink` default, declining to port ink's focus-on-unmount behaviour, the
requirement that a kept divergence carry a measurement, dropping ink source line
numbers from comments, and the rule that ink's documentation is not evidence.
That last rule is real and was paid for twice, but it is an agent's rule that
already binds every session from [`AGENTS.md`](../../AGENTS.md) with its evidence
in [ink reference](./ink-reference.md#consequences-for-how-ink-evidence-is-used);
filing it here as Open would falsely imply the owner was asked, and the owner
never was. A behaviour that exists in the code, or is registered as a parity
case, is evidence of an implementation — not of an owner judgment about it.

## Decided

### Parity is a floor, not a transcription

- **Ruling:** Where this package's own solution is better than ink's, keep it;
  never replace a better solution with ink's merely to reach a byte-for-byte
  match.
- **Limits:** This governs what parity is aimed at, not any individual
  divergence. It does not accept the two divergences the parity suite currently
  registers — `4.2#1` in [`test/parity/text.test.tsx`](../../test/parity/text.test.tsx)
  and `4.2#2` in [`test/parity/flex.test.tsx`](../../test/parity/flex.test.tsx) —
  or any other: those were the controller's calls made under this licence, and
  the owner has ruled on none of them. It licenses keeping what is *better*, not what is merely different or
  more convenient; a claim of "better" that has not been measured is outside it.
  It says nothing about divergences nobody chose — see
  [`Layer`'s column advance](#layers-column-advance-for-narrow-multi-code-point-graphemes),
  which the owner settled separately and in ink's favour. It would be reopened by
  the owner judging a specific kept divergence not worth its cost.
- **Why:** Exactly as the owner gave it: «если мои решения были лучше чем у ink,
  лучше их сохранить чем полностью повторять 1 в 1» — if my decisions were better
  than ink's, better to keep them than to reproduce it 1:1. The condition is the
  whole of the reason he offered; he argued no further, and nothing more is
  reconstructed here. The gloss recorded alongside it in the design spec — that
  the goal is "no worse than ink" rather than "identical to ink" — is the spec
  author's paraphrase, not verified as the owner's wording.
- **Source:** The owner, during the ink-parity subproject work, before
  2026-08-30. It was recorded as decision row 9 of the foundation design spec
  (`docs/specs/2026-08-28-ink-parity-foundation-design.md`), section «4. Принятые
  решения», which read in full:

  > | 9 | Где наши решения лучше ink — сохраняем их, а не копируем ink 1:1 |
  > Указание владельца. Цель — «не хуже ink», а не «идентично ink» |

  — "where our solutions are better than ink's, we keep them rather than copying
  ink 1:1", justified as «Указание владельца», *the owner's instruction*. That
  spec was deleted on 2026-08-31 at the owner's request, along with the rest of
  `packages/vue-stdout/docs/`, and it existed only on the `feat/ink-parity`
  branch, which was squashed — so no commit anywhere still contains it and git
  history does not preserve it either. The row is therefore transcribed above
  rather than linked. **This entry is now the whole of the record**: no durable
  session URL was ever available, and the committed row that used to corroborate
  it is gone. What it rests on is this transcription plus the owner's own wording
  quoted under **Why**.

### `Layer`'s column advance for narrow multi-code-point graphemes

- **Ruling:** Fix it, and keep the fix at what it actually costs — `Layer` must
  advance the write cursor by ink's rule, not by its own, at the measured
  **+4.3 % median / +8 % worst case** in the paint loop.
- **Limits:** It settles the advance rule, the two boundary repairs that come
  with it in [`src/tree/Layer.ts`](../../src/tree/Layer.ts), and — since he was
  shown the bill on 2026-08-31 — the price. It selects nothing about *how* the
  port is written: `SINGLE_UNIT_WIDTHS`, the `Uint8Array` width table indexed by
  UTF-16 code unit that brought the straight port's **+13.1 % median / +25.8 %
  worst** down to the figure he accepted, is the implementing agent's call made
  under this ruling, not his.

  **The audit's +3 % is history, not a live constraint.** A 2026-08-30 audit
  estimated the fix at +3 % median / ≤3 % worst, and the implementing brief made
  that a gate; the port did not meet it at either attempt. The owner was then
  shown the real figures and kept the fix, so the gate is spent — do not cite
  +3 % as a standing budget for this rule, and do not file exceeding it as a
  defect. What the ruling accepts is *this* measured price, not any later one,
  and it does not generalise to other divergences: it is one grapheme class,
  decided on its own.

  Reopened by the owner reversing himself, or by a fresh measurement of the same
  rule landing materially above the +4.3 % median he accepted — a change to the
  paint loop or a `string-width` upgrade that moves the width table's boundary
  are the two ways that happens.
- **Why:** No reason given, at either step. He answered «исправляй» — fix it —
  in one word, to a handover that had put the divergence and the fact that the
  fix carried a price side by side; when the port turned out to cost far more
  than the audit had estimated, he was shown the real figures, told the fix
  could be dropped on its own with `git revert 9f2160e`, and answered «давай» —
  go ahead, i.e. keep it. He argued for neither. Nothing is reconstructed here:
  **the controller's recommendation to keep the fix travelled in the very
  message he answered, and a recommendation he assented to is not an argument he
  made**; neither the audit's estimate, nor the benchmark figures, nor the
  correctness case for ink's rule is recorded as his reasoning. What he
  expressed is the selection — keep it, knowing what it costs.
- **Source:** The owner, 2026-08-31, in two untracked session exchanges, which
  is why this entry is their durable record. First «исправляй», answering the
  question this entry named as its settling condition while it stood under
  *Open* — put to him twice during the 2026-08-30 maintenance run and unanswered
  until then. Then «давай», answering the message that carried the measured cost
  and the offer to drop the fix alone. Durable state: commit `9f2160e`, whose
  message records both measurements and the 20 000-sequence comparison against
  ink's own `Output`; the measurement itself in the `SINGLE_UNIT_WIDTHS` comment
  in [`Layer.ts`](../../src/tree/Layer.ts); and the parity case *"consecutive
  combining-mark graphemes"* in
  [`test/parity/glyph-width.test.tsx`](../../test/parity/glyph-width.test.tsx),
  which asserted the mismatch through `expectParityFails` while this was open and
  now asserts agreement with ink like its neighbours — no `expectParityFails`
  registration for it remains in the suite.

## Open

Nothing open. The one entry this section carried — `Layer`'s column advance —
was answered on 2026-08-31 and now sits under **Decided** above.

An empty section is not a claim that nothing about ink parity is unsettled; it is
a claim that nothing unsettled has been *put to the owner and left hanging*. Most
of what looks decided in this area was ruled by an AI controller and is filed
nowhere, deliberately — see **What is deliberately absent** at the top of this
file.
