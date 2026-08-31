import { NodeTree } from '../NodeTree';
import { Yoga, type YogaNode } from '../yoga';
import type { DOMDocument } from './DOMDocument';

let nodeId: number = 0;

/** Yoga's "undefined" sentinel for an unlaid-out node's computed rect is `NaN`. */
function orZero(value: number): number {
  return Number.isNaN(value) ? 0 : value;
}

/**
 * Frame boundary for the per-node rect memos — see `getComputedRect`.
 *
 * @internal
 */
let rectGeneration = 0;

/**
 * Invalidate every node's cached rect, because Yoga has just re-laid-out.
 *
 * Called from `computeLayout` (`src/tree/layout.ts`) **after**
 * `calculateLayout` returns, which is the only place in the engine that moves a
 * computed value. Bumping afterwards rather than before is deliberate: a read
 * taken *during* the style/measure pass — from inside a Yoga measure callback,
 * say — then still serves the previous frame's memo, which is exactly what
 * reading Yoga directly at that moment would give, because the new layout does
 * not exist yet. Bumping first would let such a read cache pre-layout
 * coordinates under the new generation and hand them to the paint pass.
 *
 * Lives here rather than in `layout.ts` because the memo it governs is a field
 * on `DOMNode`, and `DOMNode` cannot import `layout.ts` without a cycle.
 *
 * @internal
 */
export function beginRectFrame(): void {
  rectGeneration++;
}

export enum DOMNodeType {
  DOCUMENT = 0,
  ELEMENT_NODE = 1,
  TEXT_NODE = 3,
  COMMENT_NODE = 8,
}

export interface DOMRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export class DOMNode extends NodeTree<DOMNode> {
  readonly id: number;

  readonly nodeType: DOMNodeType = DOMNodeType.ELEMENT_NODE;

  readonly nodeName: string = 'DOMNode';

  /**
   * The content rect this node was last seen at, kept only so
   * `syncBoundingClientRect` (`src/tree/render.ts`) can tell a size change from
   * a position change and fire `resize` for one and not the other. It is **not**
   * what `getBoundingClientRect()` reads — that computes live — and it is only
   * maintained for elements something is actually listening to.
   *
   * @internal
   */
  computedBoundingClientRect: DOMRect = { x: 0, y: 0, width: 0, height: 0 };

  /** @internal */
  root: DOMDocument | null;

  /**
   * The layout node this DOM node owns, or `null` when it has none.
   *
   * `DOMElement` and `DOMDocument` each own one; `DOMText` and `DOMComment`
   * deliberately do not — text is measured by the measure function of the
   * inline element that contains it, so giving it a node of its own would put
   * a second, competing box in the flex line.
   *
   * Because of that, the Yoga child list is a *subsequence* of `childNodes`,
   * not a parallel array: index mapping has to skip the node-less children
   * (see `yogaChildIndexOf`).
   *
   * @internal
   */
  yogaNode: YogaNode | null = null;

  /**
   * Generation the border-box and content-box memos below were filled in, or
   * `-1` for "never" / "explicitly invalidated". Scalars rather than a cached
   * `DOMRect` so a hit costs no property reads on a second object, and so the
   * rect handed back is always freshly allocated — see `getComputedRect`.
   *
   * @internal
   */
  private rectGeneration: number = -1;
  /** @internal */ private rectX: number = 0;
  /** @internal */ private rectY: number = 0;
  /** @internal */ private rectWidth: number = 0;
  /** @internal */ private rectHeight: number = 0;

  /** @internal */ private contentGeneration: number = -1;
  /** @internal */ private contentX: number = 0;
  /** @internal */ private contentY: number = 0;
  /** @internal */ private contentWidth: number = 0;
  /** @internal */ private contentHeight: number = 0;

  constructor() {
    super();
    this.root = null;
    this.id = nodeId++;
  }

  insertBefore(child: DOMNode, ref?: DOMNode | null | undefined): void {
    super.insertBefore(child, ref);
    child.setRootDocument(this.root);

    // Before linking, not after: whether the child even *has* a Yoga node
    // depends on the parent it just landed in (see `updateYogaOwnership`), and
    // `linkYogaChild` is a no-op for a child that owns none.
    child.updateYogaOwnership();

    this.linkYogaChild(child);
    this.emitRoot('DOMChanged');
  }

  remove(): void {
    super.remove();
    this.setRootDocument(null);

    // Unlink through the Yoga node's own parent rather than `this.parentNode`:
    // `super.remove()` has already nulled that, so reading it here would
    // silently skip the unlink and leave a detached (soon freed) node still
    // parented in the layout tree. Note `getParent()` returns a fresh JS
    // wrapper each call and so never compares `===` to the parent's
    // `yogaNode` — go through the wrapper, don't try to match identity.
    const yogaNode = this.yogaNode;
    yogaNode?.getParent()?.removeChild(yogaNode);
  }

  destroy(): void {
    // `NodeTree#destroy` detaches this node and then destroys the children,
    // each of which unlinks its own Yoga node in `remove()` above — so by the
    // time we get here this node's Yoga child list is already empty.
    super.destroy();
    this.yogaNode?.free();

    // Subclasses declare `yogaNode` as non-null for the life of the node, and
    // after `free()` it is a dangling wasm pointer. Nulling it turns any
    // use-after-destroy into an ordinary null access instead of a wasm trap,
    // and makes a second `destroy()` a no-op.
    this.yogaNode = null;
  }

  /**
   * Position of `child` in this node's Yoga child list, which skips children
   * that own no Yoga node (text, comments).
   *
   * O(n) in the number of children, which makes filling a list by appending
   * O(n²) — see `linkYogaChild`, which takes an O(1) shortcut once the list is
   * long enough for that to matter.
   *
   * @internal
   */
  yogaChildIndexOf(child: DOMNode): number {
    let index = 0;

    for (const sibling of this.childNodes) {
      if (sibling === child) break;
      if (sibling.yogaNode) index++;
    }

    return index;
  }

  /**
   * Re-decide whether this node should own a Yoga node, now that it sits under
   * a (possibly different) parent. Only `DOMElement` has anything to decide.
   *
   * @internal
   */
  updateYogaOwnership(): void {}

  /**
   * How many children a list must already hold before asking Yoga for its own
   * child count beats scanning `childNodes`.
   *
   * Measured on this machine (Apple M3 Max, `yoga-layout@3.2.1`, node 24): one
   * `getChildCount()` is a JS↔WASM crossing at ~0.17 µs, one step of
   * `yogaChildIndexOf`'s loop is ~2.4 ns, so the crossing pays for itself at
   * about 70 siblings. Below the threshold the scan is cheaper *and* needs no
   * crossing at all; above it the scan is what makes appending O(n²).
   *
   * A round 64 rather than the measured 70: the curve is flat either side of it,
   * and the point is to be on the right side of the crossover, not on it.
   * Verified at both ends — taking the shortcut unconditionally costs 13 % on a
   * tree of short rows, and never taking it costs 47 % on a tree of one long one.
   *
   * @internal
   */
  private static readonly YOGA_INDEX_SCAN_LIMIT = 64;

  /** @internal */
  linkYogaChild(child: DOMNode): void {
    const parentYogaNode = this.yogaNode;
    const childYogaNode = child.yogaNode;

    if (!parentYogaNode || !childYogaNode) return;

    // Yoga hard-aborts (a wasm trap, not a catchable error) if a node that
    // carries a measure function is given a child. A previous layout pass may
    // have installed one here — e.g. a `<stdout-text>` that held only text and has
    // now gained a nested `<stdout-text>`. Drop it before inserting; `computeLayout`
    // re-decides whether this node measures on every pass anyway.
    parentYogaNode.setMeasureFunc(null);

    const children = this.childNodes;
    const isAppend = child === children[children.length - 1];

    // An append into a long list asks Yoga how many children it has rather than
    // counting them here, because the Yoga child list is exactly the
    // yoga-owning members of `childNodes` in order (the subsequence invariant
    // documented on `yogaNode` above) — so with `child` sitting last in
    // `childNodes` and not yet inserted, Yoga's count *is* the index the scan
    // would return. That is also how ink appends (`dom.js`, `appendChildNode`).
    //
    // It holds during `updateYogaOwnership`'s relink loop too, which is the one
    // place the invariant is temporarily being rebuilt: that loop links
    // children in `childNodes` order, so when it reaches the last one, every
    // preceding yoga-owning child is already in.
    const index =
      isAppend && children.length > DOMNode.YOGA_INDEX_SCAN_LIMIT
        ? parentYogaNode.getChildCount()
        : this.yogaChildIndexOf(child);

    parentYogaNode.insertChild(childYogaNode, index);
  }

  /**
   * Point this node and everything below it at `document` — the value
   * `emitRoot` uses to reach the renderer, so a node the walk misses is a node
   * whose mutations schedule no frame.
   *
   * ## Why it stops early
   *
   * **A node's subtree always shares its root.** This function is the only writer
   * of `root` outside the constructor (which starts it `null` on a childless
   * node), and every path that changes one — `insertBefore`, `remove`, and
   * `destroy` through `remove` — goes through it and recurses. So a node already
   * holding the document being handed to it cannot have a descendant that does
   * not, and the walk below it would write every value back over itself.
   * `DOMNode.test.ts` pins the invariant, not the shortcut, because the invariant
   * is the part that can break.
   *
   * Not a micro-optimisation, because of *when* the redundant walks happen. Vue
   * mounts **bottom-up** — children built into an element before that element is
   * inserted into its parent — so the tree is assembled while detached, and each
   * insertion used to walk the whole subtree just built to write `null` over
   * `null`: O(n·depth) for the mount and again for the unmount. Measured through
   * `createApp().mount()` on a 150-deep chain: **80 704 node visits, of which 488
   * changed anything** — 1 507 with the guard. Unmount was 40 109 visits for the
   * same 488 changes.
   *
   * A flat tree hid it completely: at depth ~3 the waste is linear, which is why
   * the wide/grid/dashboard shapes move by nothing here and the deep one halves.
   * Every benchmark here also builds top-down, where the wasted walks do not
   * exist at all.
   */
  setRootDocument(document: DOMDocument | null) {
    if (this.root === document) return;

    this.root = document;

    for (const child of this.childNodes) {
      child.setRootDocument(document);
    }
  }

  /**
   * Border-box rect of this node, in cells, relative to its parent.
   *
   * ## Per-frame memo
   *
   * The four `getComputedLeft/Top/Width/Height` calls behind this were, once the
   * style walk was gone, the four largest Yoga counters on every workload — 2 963
   * each for a 1 001-element grid, because one paint reads the same element's
   * rect ~3 times (`paintChildren` places it, `paintBox` sizes its border and
   * background, `paintText` insets its text). Each is a JS↔WASM crossing, and
   * crossings were ~26 % of profiled CPU against ~4 % inside Yoga's own maths.
   *
   * The invalidation surface is a single input: **`calculateLayout` ran**. Yoga's
   * computed values are frozen between layout passes, so nothing else can move
   * one — not a style write, not a tree mutation, not a text edit. Those all
   * *dirty* Yoga, and dirtying changes nothing readable until the next
   * `calculateLayout`. `beginRectFrame()` is called from the one site that runs
   * it, and `updateYogaOwnership` clears the memo separately because a replaced
   * Yoga node is a different node, not a re-laid-out one.
   *
   * The rect is rebuilt into a fresh object on every call, hit or miss:
   * `getComputedRect`/`getContentRect` are public API, and handing out a shared
   * object would let a caller's harmless-looking `rect.width--` corrupt the
   * engine's own coordinates for the rest of the frame. What is being saved is
   * the WASM crossings, not the allocation, which measures nothing beside them.
   *
   * @internal
   */
  getComputedRect(): DOMRect {
    const { yogaNode } = this;

    if (!yogaNode) return { x: 0, y: 0, width: 0, height: 0 };

    if (this.rectGeneration !== rectGeneration) {
      this.rectGeneration = rectGeneration;
      this.rectX = yogaNode.getComputedLeft();
      this.rectY = yogaNode.getComputedTop();
      this.rectWidth = yogaNode.getComputedWidth();
      this.rectHeight = yogaNode.getComputedHeight();
    }

    return {
      x: this.rectX,
      y: this.rectY,
      width: this.rectWidth,
      height: this.rectHeight,
    };
  }

  /**
   * Content-box rect: `getComputedRect` less this node's own border and
   * padding.
   *
   * Memoised per frame on the same terms as `getComputedRect` — same single
   * invalidation input, same fresh object per call.
   *
   * Lives here rather than in `layout.ts` only because `getBoundingClientRect()`
   * needs it and `DOMNode` cannot import `layout.ts` without a cycle;
   * `layout.ts` re-exports both as free functions.
   *
   * @internal
   */
  getContentRect(): DOMRect {
    const { yogaNode } = this;

    if (!yogaNode) return { x: 0, y: 0, width: 0, height: 0 };

    if (this.contentGeneration !== rectGeneration) {
      const rect = this.getComputedRect();

      const borderLeft = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
      const borderRight = yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);
      const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
      const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

      const paddingLeft = yogaNode.getComputedPadding(Yoga.EDGE_LEFT);
      const paddingRight = yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);
      const paddingTop = yogaNode.getComputedPadding(Yoga.EDGE_TOP);
      const paddingBottom = yogaNode.getComputedPadding(Yoga.EDGE_BOTTOM);

      this.contentGeneration = rectGeneration;
      this.contentX = rect.x + borderLeft + paddingLeft;
      this.contentY = rect.y + borderTop + paddingTop;
      this.contentWidth =
        rect.width - borderLeft - borderRight - paddingLeft - paddingRight;
      this.contentHeight =
        rect.height - borderTop - borderBottom - paddingTop - paddingBottom;
    }

    return {
      x: this.contentX,
      y: this.contentY,
      width: this.contentWidth,
      height: this.contentHeight,
    };
  }

  /**
   * Drop both rect memos, because this node's Yoga node is being replaced.
   *
   * `updateYogaOwnership` (`DOMElement.ts`) frees the old node and creates a
   * fresh, never-laid-out one when an element crosses the virtual-text
   * boundary. That is not a re-layout, so `beginRectFrame` has not run and the
   * memo would keep answering with the *old* node's coordinates until the next
   * frame — where reading the fresh node gives Yoga's unlaid-out `NaN`, i.e.
   * zeros, which is what the rest of the engine expects of a node that has
   * never been laid out.
   *
   * @internal
   */
  invalidateRectCache(): void {
    this.rectGeneration = -1;
    this.contentGeneration = -1;
  }

  /**
   * This element's content box, in cells, relative to its parent.
   *
   * Computed on read rather than served from whatever the last paint cached.
   * `syncBoundingClientRect` used to refresh that cache for *every* element on
   * *every* frame — twelve Yoga getters each, ~1.0 µs per element — to keep this
   * answerable, and now does so only for elements something subscribes to.
   * Reading Yoga here makes this independent of the paint walk altogether: it is
   * correct for an element inside a `display: none` or already-flushed
   * `<Static>` subtree, which the paint walk skips and so never refreshed.
   *
   * Yoga reports `NaN` for a node never laid out; normalised to `0`, matching
   * what the cached rect started at and what `measureElement` does.
   */
  getBoundingClientRect(): DOMRect {
    const rect = this.getContentRect();

    return {
      x: orZero(rect.x),
      y: orZero(rect.y),
      width: orZero(rect.width),
      height: orZero(rect.height),
    };
  }

  getDisplayData(): Record<string, any> {
    return {
      id: this.id,
      nodeType: DOMNodeType[this.nodeType],
      ...super.getDisplayData(),
    };
  }

  emitRoot(eventName: string, ...args: any[]) {
    if (this.root) {
      this.root.emit(eventName, ...args);
    }
  }

  get textContent(): string | null {
    return null;
  }

  set textContent(value: string | null) {
    return;
  }
}
