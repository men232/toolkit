import { h, type FunctionalComponent, type VNodeChild } from 'vue';

export interface StaticRenderScope {
  item: unknown;
  index: number;
}

export interface StaticProps {
  /** Array of items to render via the default slot. */
  items: unknown[];
}

/**
 * `<Static>` permanently renders its output above everything else and never
 * repaints it: once an item has been painted it scrolls into the terminal's
 * own scrollback, like a normal `console.log`, instead of being erased and
 * redrawn with the rest of the frame on every subsequent render. Preferred
 * over ordinary `<Box>`/`<Text>` for output whose *number* of items you don't
 * control — completed tasks, log lines — and that never changes once written.
 *
 * Ported from ink's `<Static>`, with a scoped slot in place of `children`: the
 * default slot receives `{ item, index }` rather than being called
 * positionally. ink's `Static<T>` is generic, but assigning that to
 * `FunctionalComponent<Props>` would erase `T` at the call site anyway, so
 * `items`/`item` are plainly `unknown[]`/`unknown` here.
 *
 * As in ink, a stable `key` on whatever the slot returns matters once items
 * are removed or reordered upstream — pass one keyed by the item itself.
 *
 * ## A deliberate divergence from ink
 *
 * ink renders `items.slice(alreadyRendered)` and, one tick later, bumps
 * `alreadyRendered` to `items.length` so the next render's slice is empty,
 * pruning already-flushed items back out of the tree.
 *
 * This component deliberately does not prune: it always renders the *whole*
 * `items` array, so a `<Static>` box's children only ever grow. Porting ink's
 * prune-one-tick-later shape onto Vue races this package's render loop —
 * pruning is a *second*, separately-scheduled reactive update, and nothing
 * guarantees the engine's own render runs between the update that mounts new
 * items and the one that would prune them. Vue's scheduler can (and under test
 * does) collapse both into one flush, silently dropping content the engine
 * never saw mounted.
 *
 * The layout cost of never pruning **is** solved, in `src/tree/layout.ts` +
 * `src/tree/staticFlush.ts`: `prepareNode` skips a `<Static>` box's
 * already-flushed children outright, since flushed content is immutable and
 * nothing reads its rect again outside a resize. Measured on a steady-state
 * frame with N flushed items still mounted and a live leaf changing each frame:
 * 4.5 ms at N = 5 000 with the skip against 118.5 ms without it — **26×**. What
 * is still unbounded is *memory*: those items keep their Yoga wasm nodes for the
 * life of the process, where ink frees them by pruning. Not measured, not
 * solved.
 *
 * The "never repainted" guarantee is the engine's, not this component's: the
 * box below carries `internalStatic`, which `src/tree/render.ts`
 * (`collectStaticOutput`) reads to paint each child exactly once — tracked
 * separately from how many are still mounted — and to leave this subtree out
 * of the ordinarily-repainted frame (`skipStatic`). `Container#onStatic`
 * writes the result to the terminal.
 */
export const Static: FunctionalComponent<StaticProps> = (props, { slots }) => {
  const children: VNodeChild[] = props.items.map((item, index) =>
    slots.default?.({ item, index } satisfies StaticRenderScope),
  );

  return h(
    'stdout-box',
    {
      internalStatic: true,
      position: 'absolute',
      flexDirection: 'column',
    },
    children,
  );
};

Static.displayName = 'Static';
