import type { ReactNode } from 'react';
import { renderToString as inkRenderToString } from 'ink';
import type { VNode } from 'vue';
import { expect, it } from 'vitest';
import { renderToString } from '../../src/renderToString';

export function renderInk(node: ReactNode, columns = 80): string {
  return inkRenderToString(node, { columns });
}

export function renderVue(node: () => VNode, columns = 80): string {
  return renderToString({ render: node }, { columns });
}

export type ParityOptions = {
  columns?: number;
  /**
   * Marks a deliberate divergence from ink: when set, the case is asserted to
   * DIFFER from ink on purpose, and snapshotted.
   *
   * The value is an opaque identifier (`'4.2#1'`, `'4.2#2'` — once row numbers
   * in a design spec that no longer exists). It is not resolved anywhere; its
   * job is to be greppable, so `grep -rn 'diverges:' test/parity/*.tsx` counts
   * the accepted divergences. The reasoning for each lives in a comment above
   * its own case. Keep the existing spellings rather than renumbering.
   */
  diverges?: string;
};

/**
 * Assert that vue-stdout renders a case byte-for-byte like ink.
 *
 * The expected value is computed from ink itself, so it cannot be
 * mis-transcribed and it tracks the pinned ink version automatically.
 *
 * Calls vitest's `it()` internally, so it must be invoked at collection
 * time inside a `describe` block (or top-level test file) — never inside
 * another `it()`/`test()` callback.
 */
export function expectParity(
  name: string,
  options: ParityOptions,
  ink: () => ReactNode,
  vue: () => VNode,
): void {
  const columns = options.columns ?? 80;

  it(name, () => {
    const inkOutput = renderInk(ink(), columns);
    const vueOutput = renderVue(vue, columns);

    if (options.diverges) {
      expect(
        vueOutput,
        `deliberate divergence ${options.diverges} but output matched ink -- if the convergence is right, drop the \`diverges\` marker and the reasoning comment above this case; if not, this is a regression`,
      ).not.toBe(inkOutput);
      expect(vueOutput).toMatchSnapshot();
      return;
    }

    expect(vueOutput).toBe(inkOutput);
  });
}

/**
 * Register a still-broken parity case: the "red case backlog" (tracked,
 * known-mismatching-ink, expected to eventually be fixed and promoted to
 * `expectParity`).
 *
 * Deliberately not `it.fails`: that vitest helper treats *any* thrown error
 * as "expected failure" — including a crash unrelated to the tracked bug
 * (e.g. a regression somewhere else in the render pipeline). Such a crash
 * would still make `it.fails` report green, silently masking a completely
 * different problem as if it were the one this case documents. This asserts
 * the *specific* shape of failure — vue-stdout's output differs from ink's —
 * and lets any other exception propagate as an ordinary (unmasked, red)
 * test failure instead of being swallowed.
 *
 * Once the underlying bug is fixed, `vueOutput` starts matching `inkOutput`
 * and the `.not.toBe` assertion below fails loudly — the signal to promote
 * this case to `expectParity` and delete this call. The backlog is exactly the
 * set of these registrations: `grep -rn 'expectParityFails(' test/parity/`.
 */
export function expectParityFails(
  name: string,
  options: ParityOptions,
  ink: () => ReactNode,
  vue: () => VNode,
): void {
  it(name, () => runParityFailureCase(options, ink, vue));
}

/**
 * The assertion body behind {@link expectParityFails}, factored out so
 * `test/helpers/parity.test.ts` can exercise it directly (call it inside its
 * own `expect(() => ...)`) without registering a real `it()` for every case
 * it needs to prove a property about. `expectParityFails` itself is just
 * this wired into `it()` — kept that thin so there is nothing left in it
 * that this export doesn't also cover.
 *
 * @internal
 */
export function runParityFailureCase(
  options: ParityOptions,
  ink: () => ReactNode,
  vue: () => VNode,
): void {
  const columns = options.columns ?? 80;

  const inkOutput = renderInk(ink(), columns);
  const vueOutput = renderVue(vue, columns);

  expect(
    vueOutput,
    'red case backlog entry now matches ink -- promote it to expectParity and remove this expectParityFails call',
  ).not.toBe(inkOutput);
}
