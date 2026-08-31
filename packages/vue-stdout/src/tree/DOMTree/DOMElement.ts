import { isVirtualText } from '../tags';
import { Yoga, type YogaNode } from '../yoga';
import { DOMNode, DOMNodeType } from './DOMNode';
import { DOMText } from './DOMText';

/**
 * Every edge slot `applyStyles` can write. Yoga resolves an edge from the most
 * specific slot that is set, so clearing only `EDGE_ALL` would leave a stale
 * `EDGE_TOP` winning over a freshly applied `margin` shorthand.
 */
const RESETTABLE_EDGES = [
  Yoga.EDGE_ALL,
  Yoga.EDGE_HORIZONTAL,
  Yoga.EDGE_VERTICAL,
  Yoga.EDGE_START,
  Yoga.EDGE_END,
  Yoga.EDGE_LEFT,
  Yoga.EDGE_RIGHT,
  Yoga.EDGE_TOP,
  Yoga.EDGE_BOTTOM,
] as const;

/** The four edges `top`/`right`/`bottom`/`left` write directly (no shorthand slots). */
const RESETTABLE_POSITION_EDGES = [
  Yoga.EDGE_TOP,
  Yoga.EDGE_RIGHT,
  Yoga.EDGE_BOTTOM,
  Yoga.EDGE_LEFT,
] as const;

/**
 * Bring a **freshly created** Yoga node up to the state `resetYogaStyles` leaves
 * it in — only three writes, because a new node already holds the rest.
 *
 * ## Why separately
 *
 * The constructor used to run all 57 of `resetYogaStyles`' writes on every
 * element. 54 are Yoga's own defaults written back over themselves: measured on
 * `yoga-layout@3.2.1`, exactly **3 of the 59 readable style properties** differ
 * between a node straight out of `Yoga.Node.create()` and one that took the full
 * reset — `flexDirection`, `flexWrap`, `alignContent`. Each of the other 54 is a
 * JS↔WASM crossing, and crossings are ~68 % of construction CPU, so a
 * 1 001-element tree cost 57 000 Yoga calls where ink's cost 6 400.
 *
 * ## Why this is safe rather than merely cheaper
 *
 * Both callers — the constructor and `updateYogaOwnership`'s create branch —
 * hand it an unwritten `Yoga.Node.create()` node, and in both `yogaStylesDirty`
 * is `true` afterwards, so the next layout pass runs the full
 * `resetYogaStyles` + `applyStyles` pair before the node is laid out. **The
 * three writes keep the node's *unstyled* state ours rather than Yoga's in the
 * meantime — which matters for the one element the layout pass never visits, a
 * late-arriving descendant of an already-flushed `<Static>` child.**
 *
 * `resetYogaStyles` calls this, so the three cannot drift apart. What *could*
 * drift is the other direction: a new default added to `resetYogaStyles` that
 * Yoga does not itself default to would have to be added here too.
 * `DOMElement.test.ts` diffs all 59 properties of a fresh-plus-`initYogaStyles`
 * node against a fresh-plus-full-reset node and catches that.
 */
export function initYogaStyles(yogaNode: YogaNode): void {
  // TRAP: Yoga's own default `flexDirection` is COLUMN, the opposite of CSS.
  // ink sets row explicitly too. Drop this line and every box stacks its
  // children vertically. Do not "simplify" it away.
  yogaNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);

  // Divergence from ink: neighbours wrap at node boundaries. ink uses NO_WRAP
  // and lets `flexShrink` squeeze siblings instead.
  yogaNode.setFlexWrap(Yoga.WRAP_WRAP);

  // TRAP: STRETCH, not Yoga's own FLEX_START default. Under WRAP it is
  // `alignContent`, not `alignItems`, that sizes a flex line in its container,
  // and a line under FLEX_START is sized to its content — leaving
  // `alignItems: stretch` nothing to stretch to, so children collapse. ink
  // never hits this: it uses NO_WRAP, where `alignContent` is inert.
  yogaNode.setAlignContent(Yoga.ALIGN_STRETCH);
}

/**
 * Put a Yoga node back into the state a freshly created element has, so that
 * `applyStyles` can then be run over it as if the node were new.
 *
 * **This has to cover the whole surface `applyStyles` writes, not just our
 * defaults.** Every setter there is guarded by `'x' in style`, so a property
 * that *disappears* from an element's attributes is skipped rather than
 * cleared — fine only if the node is rebuilt each pass, which ours is not.
 * Without this reset `<Box :width="wide ? 20 : undefined">` stays 20 wide
 * forever once flipped.
 *
 * Edge setters are cleared with `undefined`, not `0`: writing `0` into
 * `EDGE_HORIZONTAL` would out-rank a later `margin: 2` shorthand.
 *
 * Only ever call this on a node that has been *used*. On a brand-new one, 54 of
 * the 57 writes below are no-ops — see `initYogaStyles`, which is the other 3.
 */
export function resetYogaStyles(yogaNode: YogaNode): void {
  // --- two of the three deliberate divergences from ink, plus a trap ------
  // (`flexDirection`, `flexWrap`, `alignContent` — each documented there.)
  initYogaStyles(yogaNode);

  // The third divergence from ink: ink puts `flexShrink: 1` on text so it is
  // squeezed to fit; we leave it at 0 so text keeps its measured width and
  // `initYogaStyles`'s wrap moves it to the next line instead of shredding it.
  // Also Yoga's default — set explicitly because it is a choice, not an
  // accident, which is why it lives here and not in `initYogaStyles`.
  yogaNode.setFlexShrink(0);

  // --- plain Yoga defaults, re-asserted so removals take effect ----------

  yogaNode.setPositionType(Yoga.POSITION_TYPE_RELATIVE);

  for (const edge of RESETTABLE_POSITION_EDGES) {
    yogaNode.setPosition(edge, undefined);
  }

  yogaNode.setFlexGrow(0);
  yogaNode.setFlexBasisAuto();
  yogaNode.setAlignItems(Yoga.ALIGN_STRETCH);
  yogaNode.setAlignSelf(Yoga.ALIGN_AUTO);
  yogaNode.setJustifyContent(Yoga.JUSTIFY_FLEX_START);

  // TRAP: `applyStyles` reads a *missing* `display` as `DISPLAY_NONE`, and only
  // runs that branch when the key is present — so this reset is what keeps an
  // element that never set `display`, or just had it removed, visible.
  yogaNode.setDisplay(Yoga.DISPLAY_FLEX);

  yogaNode.setWidthAuto();
  yogaNode.setHeightAuto();
  yogaNode.setMinWidth(undefined);
  yogaNode.setMinHeight(undefined);
  yogaNode.setMaxWidth(undefined);
  yogaNode.setMaxHeight(undefined);
  yogaNode.setAspectRatio(undefined);

  for (const edge of RESETTABLE_EDGES) {
    yogaNode.setMargin(edge, undefined);
    yogaNode.setPadding(edge, undefined);
    yogaNode.setBorder(edge, undefined);
  }

  yogaNode.setGap(Yoga.GUTTER_ALL, undefined);
  yogaNode.setGap(Yoga.GUTTER_COLUMN, undefined);
  yogaNode.setGap(Yoga.GUTTER_ROW, undefined);
}

export class DOMElement extends DOMNode {
  readonly nodeType: DOMNodeType.ELEMENT_NODE = DOMNodeType.ELEMENT_NODE;

  readonly nodeName: string = 'DOMElement';

  readonly tagName: string;

  readonly attributes: Record<string, any> = {};

  /**
   * An element owns a Yoga node — **except** while it is virtual text, i.e. an
   * inline element nested inside another one, whose box belongs to the
   * outermost inline ancestor. See `updateYogaOwnership`.
   *
   * @internal
   */
  declare yogaNode: YogaNode | null;

  /**
   * This element's `attributes` have changed since `prepareNode`
   * (`src/tree/layout.ts`) last pushed them into `yogaNode`, so the next layout
   * pass must reset and reapply them.
   *
   * ## Why the flag exists
   *
   * Styles used to be reset and reapplied for *every* element on *every* frame.
   * That cost 27 edge setters per element per frame before a single style was
   * applied, and — far worse — destroyed Yoga's own incremental layout cache:
   * `resetYogaStyles` writes `RELATIVE`/`ROW`, `applyStyles` writes the
   * element's real `absolute`/`column` straight back, and Yoga, seeing a value
   * change, invalidates the whole subtree. Measured on a `<Static>` box holding
   * 5 000 flushed children: 0.009 ms for the reset alone, 4.5 ms once
   * `applyStyles` ran, every frame, for content immutable by definition. ink and
   * vue-tui both apply styles at mutation time instead.
   *
   * ## Why a flag and not eager application in `patchProp`
   *
   * Vue patches one prop at a time, so applying eagerly would run the whole
   * reset+apply pair once per changed prop — worse than once per frame during
   * mount. Deferring to the layout pass coalesces a tick's worth of prop changes
   * into the single application ink's reconciler does per commit, and keeps the
   * reset+apply pair together, so the shorthand-vs-edge precedence problem
   * `resetYogaStyles` exists to solve needs no family reconcilers.
   *
   * ## Completeness of the invalidation
   *
   * The applied state is a function of exactly two things, and each reaches this
   * flag:
   *
   * - `attributes` — written only by `setAttribute`/`removeAttribute`, which set
   *   the flag. Writing `element.attributes` directly bypasses it (it schedules
   *   no frame either, so it was already unsupported).
   * - the identity of `yogaNode` — replaced only by `updateYogaOwnership`, which
   *   sets the flag on the fresh node.
   *
   * Nothing else writes this node's Yoga *style*: the engine's only other Yoga
   * writes are the layout root's `setWidth` (re-applied every pass anyway) and
   * `setMeasureFunc`, which is not a style.
   *
   * @internal
   */
  yogaStylesDirty: boolean = true;

  /**
   * Nothing has written a style to this element's Yoga node yet: it still holds
   * exactly what `initYogaStyles` left on it, which *is* the state
   * `resetYogaStyles` writes. So the next application can skip the reset
   * entirely.
   *
   * ## Why this exists
   *
   * `resetYogaStyles` undoes a *previous* application; on a first one there is
   * nothing to undo. Its 52 writes are then 52 JS↔WASM crossings leaving the node
   * exactly as they found it — and `prepareNode` ran them for every element on
   * the first layout pass, because `yogaStylesDirty` starts `true`. Measured over
   * the eight benchmark workloads at width 100: **52.0 – 55.0 Yoga style writes
   * per element on the first pass, of which 94.6 – 100 % wrote a value the node
   * already held**, and `resetYogaStyles` alone was **58 – 64 %** of that pass.
   * The same waste `initYogaStyles` removed from the constructor, one phase later.
   *
   * ## Why a flag rather than a "skip if unchanged" guard on each write
   *
   * A guard trades a setter crossing for a getter one, and a Yoga read is **not**
   * cheaper than the write it avoids: 0.82× a `setMargin`, 0.85× a
   * `setFlexDirection`, 0.88× a `setFlexGrow`, **1.98×** a `setWidthAuto`. Even
   * where every write is redundant the guarded form saves 7 – 13 %, and on
   * `width` it costs 94 % more. A JS boolean crosses nothing.
   *
   * ## What has to keep it honest
   *
   * It must be `false` whenever *anything* has written a style to the node. Two
   * writers exist and each clears it **unconditionally**: `prepareNode`'s
   * `applyStyles` + `restrictWrapToRowAxis` pair, and — the one that is easy to
   * miss — `computeLayout`'s `setWidth` on the layout root, a style write that
   * happens outside the apply pair. Set back to `true` only where a brand-new
   * Yoga node replaces the old one (`updateYogaOwnership`).
   *
   * @internal
   */
  yogaStylesPristine: boolean = true;

  constructor(tagName: string) {
    super();

    this.tagName = tagName;

    // Parentless at construction, so never virtual yet. `updateYogaOwnership`
    // runs on insertion and takes the node away again if it lands inside an
    // inline element.
    this.yogaNode = Yoga.Node.create();

    // Not `resetYogaStyles`: the node is brand-new, so 54 of that function's 57
    // writes would only restate Yoga's own defaults. `yogaStylesDirty` starts
    // `true`, so the full reset+apply pair still runs before the first layout.
    initYogaStyles(this.yogaNode);
  }

  /**
   * Create or free this element's Yoga node so that it matches ink's model:
   * an inline element nested in another inline element (`ink-virtual-text`)
   * has none, everything else has one.
   *
   * Called on every insertion, and both directions are real — Vue moves nodes
   * between parents, so an element can become virtual and stop being virtual
   * over its lifetime.
   *
   * TRAP: a node being freed must be unlinked from the layout tree first, from
   * its children as well as its parent. `free()` does not detach, so a child
   * left parented here keeps a pointer to freed wasm memory and the next
   * `insertChild` on it traps rather than throws.
   *
   * @internal
   */
  updateYogaOwnership(): void {
    const shouldOwn = !isVirtualText(this);

    if (shouldOwn === !!this.yogaNode) return;

    // Both branches replace the node this element's rect memo was filled from,
    // and neither runs a layout pass, so nothing else would drop it.
    this.invalidateRectCache();

    if (shouldOwn) {
      this.yogaNode = Yoga.Node.create();

      // Brand-new node again — see the constructor.
      initYogaStyles(this.yogaNode);

      // The new node carries the reset defaults and none of this element's own
      // styles; without this the next layout pass would find the element clean
      // and lay it out as an unstyled box.
      this.yogaStylesDirty = true;

      // ...and nothing has written to it since `initYogaStyles`, so that
      // application can skip the reset even though this element was styled
      // before it went virtual. The old node is freed below, so nothing carries.
      this.yogaStylesPristine = true;

      // Children laid out nowhere while this element was virtual; adopt them.
      for (const child of this.childNodes) {
        this.linkYogaChild(child);
      }

      return;
    }

    const yogaNode = this.yogaNode!;

    for (const child of this.childNodes) {
      if (child.yogaNode) yogaNode.removeChild(child.yogaNode);
    }

    yogaNode.getParent()?.removeChild(yogaNode);
    yogaNode.free();
    this.yogaNode = null;
  }

  getDisplayName(): string {
    return `${this.nodeName}(${this.tagName})`;
  }

  getDisplayData(): any {
    return {
      ...super.getDisplayData(),
      tagName: this.tagName,
      attributes: this.attributes,
    };
  }

  getAttribute(name: string): any {
    return this.attributes[name];
  }

  setAttribute(name: string, value: any) {
    this.attributes[name] = value;
    this.yogaStylesDirty = true;
    this.emitRoot('DOMChanged');
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
    this.yogaStylesDirty = true;
    this.emitRoot('DOMChanged');
  }

  set textContent(value: string) {
    // Copy first: `destroy()` splices the child out of `childNodes`, so
    // iterating the live array skips every other child — survivors linger in
    // the DOM with their Yoga nodes still parented here, and the element lays
    // out against content it no longer has.
    [...this.childNodes].forEach(c => c.destroy());

    if (!value) return;

    const textNode = new DOMText(value);

    this.appendChild(textNode);
  }

  get textContent(): string {
    let text = '';

    for (let index = 0; index < this.childNodes.length; index++) {
      const childNode = this.childNodes[index];

      let nodeText = '';

      if (childNode.nodeType === DOMNodeType.COMMENT_NODE) continue;

      nodeText = childNode.textContent ?? '';
      text += nodeText;
    }

    return text;
  }
}
