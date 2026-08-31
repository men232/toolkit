import type { DOMElement } from './DOMTree/DOMElement';

/**
 * How many of each `<Static>` element's children have already been flushed to
 * the terminal — the entire mechanism behind "printed once, never repainted".
 *
 * ink prunes flushed children back out of the tree a tick later, purely for
 * React's own performance. Doing that here would race Vue's scheduler: the
 * update that mounts new static children and the later one that would prune
 * them can collapse into a single flush, silently dropping content the engine
 * never saw mounted. So `components/Static.tsx` never prunes — it re-renders
 * the whole `items` array every time and children only ever grow.
 *
 * Unless `items` shrinks upstream (a filter, a splice, a reset), which shrinks
 * `childNodes` and strands a forward-only counter above the new length:
 * `childNodes.slice(flushed)` then comes back empty until the array regrows
 * past the old high-water mark, silently never printing anything in that
 * range. Both sides therefore clamp the stored count down to
 * `childNodes.length` — `collectStaticOutput` (`render.ts`) on the write side,
 * {@link readClampedFlushedCount} on `layout.ts`'s read side. The cost is a
 * possible re-print when a shrink is followed by different items landing in
 * the same positions, preferred over items lost forever.
 *
 * `layout.ts`'s `prepareNode` also skips re-styling and re-measuring static
 * children below this count — immutable once flushed — which is what keeps
 * thousands of static items off the per-frame work list. `resetStaticFlushCounts`
 * clears the map on resize so they are prepared once more at the new width.
 *
 * Its own module because `layout.ts` cannot import `render.ts` without a cycle.
 * `WeakMap`, so a destroyed element's entry is reclaimed with it.
 */
export const staticFlushedCount = new WeakMap<DOMElement, number>();

/**
 * `staticFlushedCount.get(element)` clamped to the element's current child
 * count — see above: a stale count above `childNodes.length` would skip
 * preparing children that are not, from this box's perspective, flushed yet.
 */
export function readClampedFlushedCount(element: DOMElement): number {
  return Math.min(staticFlushedCount.get(element) ?? 0, element.childNodes.length);
}
