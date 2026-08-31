import type { DOMElement } from './tree';
import { getComputedRect } from './tree/layout';

/** Return shape of {@link measureElement}. */
export interface ElementMetrics {
  /**
   * Horizontal position within the live layout region: this element's own
   * computed offset, plus every ancestor's, accumulated by walking up the
   * tree. Not the same thing `getComputedRect`/`getContentRect` (in
   * `src/tree/layout.ts`) return -- those are relative to the immediate
   * parent only.
   */
  x: number;

  /** Vertical position, accumulated the same way as `x`. */
  y: number;

  /** Element's border-box width. */
  width: number;

  /** Element's border-box height. */
  height: number;
}

/** Yoga's "undefined" sentinel for an unlaid-out node's computed rect is `NaN`. */
function orZero(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Measure a `<Box>` (or other) element's computed layout.
 *
 * Built on `getComputedRect` (`src/tree/layout.ts`): `width`/`height` are
 * that rect's, and `x`/`y` sum every ancestor's computed rect up to the root.
 * Ported from ink's `measureElement`, same accumulate-up-the-tree semantics.
 *
 * Returns all zeros for a node owning no Yoga node -- see the `<Text>` caveat
 * below. A node that owns one but has never been laid out reads back Yoga's
 * `NaN` sentinel, which this normalises to `0` as well. That diverges from
 * ink, which leaves the `NaN` despite documenting "returns all zeros", but
 * `NaN` propagates silently through any arithmetic a caller does. Call this
 * from post-render code (`onMounted`, an effect, an input or `resize`
 * handler), never from `setup()` or a render function, where no layout pass
 * has run and the zeros do not yet reflect the eventual layout.
 *
 * What it reads is the **most recent layout pass**, and under a `maxFps` cap
 * that pass ran for the frame currently on screen rather than for the newest
 * state (`MountOptions.maxFps` skips the pass, not just the write). Called
 * from an input handler mid-burst this therefore reports the geometry the
 * user is looking at, which is usually what was wanted; `useBoxMetrics` is
 * the reactive form and refreshes on the same cadence.
 *
 * **A `<Text>` nested inside another `<Text>` always reads back all zeros.**
 * Such a text run is "virtual" (`src/tree/tags.ts`'s `isVirtualText`): its
 * content folds into the outermost `<Text>` ancestor's measure function and
 * it owns no Yoga node at all. Matching ink, this returns plausible-looking
 * zeros rather than throwing or warning. Measure the outermost `<Text>` or an
 * enclosing `<Box>` instead.
 */
export function measureElement(node: DOMElement): ElementMetrics {
  if (!node.yogaNode) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  const rect = getComputedRect(node);

  let x = orZero(rect.x);
  let y = orZero(rect.y);
  let current = node.parentNode;

  while (current) {
    if (current.yogaNode) {
      const parentRect = getComputedRect(current);
      x += orZero(parentRect.x);
      y += orZero(parentRect.y);
    }

    current = current.parentNode;
  }

  return { x, y, width: orZero(rect.width), height: orZero(rect.height) };
}
