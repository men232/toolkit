import type { VNode } from 'vue';
import { nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from '../src';
import { createApp } from '../src/createApp';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * `ProgressBar` sizes its bar off `useContainerSize`, which only learns its
 * container's real width from a `resize` event fired during the *paint*
 * pass (`syncBoundingClientRect`, `src/tree/render.ts`) -- after the
 * component's first render, which ran with `width` still at its initial `0`.
 * Reflecting the corrected width takes a second reactive render pass, which
 * `renderToString` (a single synchronous frame, see its own doc comment)
 * never gets. The live `render()` API used here does: `await flush()` lands
 * the first (zero-width) frame, and the following `nextTick()` + `flush()`
 * land the corrected one, matching what an interactive terminal app actually
 * shows a user (the first frame is not visibly painted to a real TTY before
 * the second settles).
 */
async function settle(vnode: () => VNode, columns = 20): Promise<string> {
  const stdout = createStdout(columns);
  // `maxFps: 0` (unlimited): this helper asserts on the
  // *second* of two frames landed a tick apart, with no real time elapsed in
  // between -- the default `maxFps: 30` throttle would otherwise coalesce
  // them into the first (zero-width) frame alone.
  const app = createApp({ render: vnode });
  app.mount({ stdout, maxFps: 0 });

  await flush();
  await nextTick();
  await flush();

  const frame = stdout.get();
  app.unmount();
  return frame;
}

// `width` reaches the root `<Box>` `ProgressBar.tsx` renders via Vue's
// attribute fallthrough (it isn't one of `ProgressBarProps`'s own declared
// props), which is real, working runtime behaviour but isn't reflected in
// `ProgressBarProps`'s type -- cast, same convention as the `props as any`
// spread `test/parity/size.test.tsx` already uses for the same reason.
const progressBar = (props: {
  value: number;
  width: number;
  min?: number;
  max?: number;
  showPercent?: boolean;
}) => (<ProgressBar {...(props as any)} />) as VNode;

describe('ProgressBar', () => {
  it('renders at the 0 boundary', async () => {
    const frame = await settle(() => progressBar({ value: 0, width: 20 }));

    expect(frame).toBe(
      '╭──────────────────╮\n│░░░░░░░░░░░░░     │\n╰──────────────────╯',
    );
  });

  it('renders at the 100 boundary', async () => {
    const frame = await settle(() => progressBar({ value: 100, width: 20 }));

    expect(frame).toBe(
      '╭──────────────────╮\n│█████████████     │\n╰──────────────────╯',
    );
  });

  // Intermediate values, none of them a round number and none of them
  // producing a 4-character percent label -- exactly the cases the old
  // fixed availableSpace/percentText.value.length mismatch got wrong (see
  // ProgressBar.tsx's `percentSlotWidth` doc comment). A bar that still
  // wraps onto a spurious second line at any of these would mean the fix
  // regressed; a single-line frame at every one confirms `percentSlotWidth`
  // (not the label's actual length) is what the bar math agrees with now.
  it.each([
    { value: 7, bar: '░░░░░░░░░░░░░' },
    { value: 42, bar: '█████░░░░░░░░' },
    { value: 99, bar: '████████████░' },
  ])('renders at an intermediate value ($value%) without wrapping', async ({ value, bar }) => {
    const frame = await settle(() => progressBar({ value, width: 20 }));

    expect(frame).toBe(`╭──────────────────╮\n│${bar}     │\n╰──────────────────╯`);
  });

  it('shows the percentage when showPercent is set', async () => {
    const frame = await settle(() =>
      progressBar({ value: 100, width: 20, showPercent: true }),
    );

    expect(frame).toBe(
      '╭──────────────────╮\n│█████████████ 100%│\n╰──────────────────╯',
    );
  });

  it('keeps the bar column stable across digit-count changes when showPercent is set', async () => {
    // Regression guard for the bug itself: with a fixed percent slot, the
    // bar's own width (and therefore where its filled/unfilled boundary
    // falls) must not shift just because the label went from 2 to 3
    // characters. Same `value`s at two different digit counts, comparing
    // where the bar segment starts rather than a full literal frame.
    const seven = await settle(() =>
      progressBar({ value: 7, width: 20, showPercent: true }),
    );
    const fortyTwo = await settle(() =>
      progressBar({ value: 42, width: 20, showPercent: true }),
    );

    expect(seven).toBe('╭──────────────────╮\n│░░░░░░░░░░░░░ 7%  │\n╰──────────────────╯');
    expect(fortyTwo).toBe('╭──────────────────╮\n│█████░░░░░░░░ 42% │\n╰──────────────────╯');
  });

  // The denominator was `max`, not `max - min`, so every
  // non-default `min` reported a percentage scaled by min/max: 50% of the
  // 50..100 range came out as 25%. Correct only when min is 0, which is the
  // default, which is why it went unnoticed. Values outside the range are
  // clamped too -- a value under `min` used to produce a negative percent,
  // and `'\u2588'.repeat()` of a negative count throws.
  //
  // Asserted against the fixed-width percent slot (a leading space plus
  // `percentSlotWidth` characters, see `ProgressBar.tsx`) rather than a bare
  // substring: "0%" on its own is also a substring of "50%" and "100%".
  const percentSlot = (label: string) => ` ${label.padEnd(4)}`;

  it.each([
    { value: 75, min: 50, max: 100, label: '50%' },
    { value: 50, min: 50, max: 100, label: '0%' },
    { value: 100, min: 50, max: 100, label: '100%' },
    { value: 25, min: 50, max: 100, label: '0%' },
    { value: 200, min: 50, max: 100, label: '100%' },
    { value: 3, min: 2, max: 6, label: '25%' },
  ])(
    'scales value $value of [$min, $max] to $label',
    async ({ value, min, max, label }) => {
      const frame = await settle(() =>
        progressBar({ value, min, max, width: 20, showPercent: true }),
      );

      expect(frame.split('\n')[1]).toContain(percentSlot(label));
    },
  );

  // A degenerate range has nothing to divide by. Reporting it as complete
  // once the value reaches the (single) point of the range keeps the bar out
  // of NaN/Infinity territory without inventing a partial fill.
  it.each([
    { value: 5, label: '100%' },
    { value: 4, label: '0%' },
  ])('treats min === max as $label at value $value', async ({ value, label }) => {
    const frame = await settle(() =>
      progressBar({ value, min: 5, max: 5, width: 20, showPercent: true }),
    );

    expect(frame.split('\n')[1]).toContain(percentSlot(label));
  });
});
