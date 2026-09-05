import { withCache } from '@andrew_l/toolkit';
import widestLine from 'widest-line';
import type { DOMDocument } from './DOMTree/DOMDocument';
import { type DOMElement, resetYogaStyles } from './DOMTree/DOMElement';
import {
  type DOMNode,
  DOMNodeType,
  type DOMRect,
  beginRectFrame,
} from './DOMTree/DOMNode';
import { beginSquashFrame, squashTextNodes } from './squashText';
import { readClampedFlushedCount } from './staticFlush';
import { isInlineElement, isStaticElement } from './tags';
import { type Styles, applyStyles } from './utils/applyStyles';
import { wrapText } from './utils/wrapText';
import { Yoga, type YogaNode } from './yoga';

/**
 * Elements that lay out their own text rather than their children's boxes.
 * They get a Yoga measure function instead of Yoga children.
 */
export { INLINE_ELEMENT_TAGS } from './tags';

export type LayoutRoot = DOMElement | DOMDocument;

/**
 * Frame boundary for `getTextWrapStyle`'s per-frame cache — see that function.
 *
 * @internal
 */
let textWrapGeneration = 0;

/** @internal */
interface TextWrapCacheEntry {
  generation: number;
  value: Styles['textWrap'];
}

/** @internal */
const textWrapCache = new WeakMap<DOMElement, TextWrapCacheEntry>();

/**
 * Lay out `root` and everything beneath it, in place.
 *
 * Styles are read off each element's `attributes` and pushed into the Yoga
 * node that element already owns, so there is one tree, not two: no shadow
 * render tree is built or thrown away here.
 *
 * `width` is the width available to the root. An explicit `width` style on the
 * root still wins — it is applied after this default.
 */
export function computeLayout(root: LayoutRoot, width: number): void {
  const { yogaNode } = root;

  if (!yogaNode) return;

  // The frame boundary both per-frame caches trust: every render path calls
  // `computeLayout` before painting anything, `renderStaticElement` included.
  beginSquashFrame();
  textWrapGeneration++;

  prepareNode(root);

  // After `prepareNode`, which would otherwise clobber it — but only when the
  // root sets no `width` of its own, which must win over the available width.
  if (!hasOwnWidth(root)) {
    yogaNode.setWidth(width);
  }

  yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);

  // Every node's cached rect is now stale, and this is the only line in the
  // engine that can make it so — see `beginRectFrame`. After the call, not
  // before: a rect read taken during `prepareNode` must still see the layout
  // that actually exists at that moment.
  beginRectFrame();
}

/**
 * Border-box rect of `node`, in cells, relative to its parent.
 *
 * The implementation lives on `DOMNode` (`DOMTree/DOMNode.ts`) because
 * `getBoundingClientRect()` needs it and that file cannot import this one
 * without a cycle. This is the name the rest of the engine uses.
 */
export function getComputedRect(node: DOMNode): DOMRect {
  return node.getComputedRect();
}

/** Content-box rect of `node`: `getComputedRect` less border and padding. */
export function getContentRect(node: DOMNode): DOMRect {
  return node.getContentRect();
}

/**
 * Whether `element` lays out its own text instead of its children's boxes.
 *
 * The single source of truth shared by layout and painting: an element Yoga
 * measures as text (`applyMeasureFunc`) is also the element that writes that
 * text into the `Layer` (`render.ts`). Drift between the two means text that
 * occupies space but is never drawn, or the reverse. Safe to call after a
 * layout pass — none of the inputs change between laying out and painting.
 */
export function measuresOwnText(element: DOMElement): boolean {
  return canMeasureText(element) && !!squashTextNodes(element);
}

/**
 * The structural half of `measuresOwnText`, split out so `applyMeasureFunc`
 * squashes the subtree once rather than twice.
 *
 * A nested inline element owns no Yoga node (`isVirtualText`), so the
 * `yogaNode` check is what keeps this false for the inside of a text flow. The
 * child-count check covers an inline element containing a `<stdout-box>`,
 * which Yoga will not let us both measure and give children to; that falls
 * back to laying out the child boxes.
 *
 * @internal
 */
function canMeasureText(element: DOMElement): boolean {
  return (
    isInlineElement(element) &&
    !!element.yogaNode &&
    element.yogaNode.getChildCount() === 0
  );
}

/**
 * Text-wrapping mode in force for `element`, walking up through every
 * ancestor `<Box>` until one sets `textWrap`, defaulting to `'wrap'` if none
 * does.
 *
 * The cascade is this project's own addition, not ink behaviour: in ink
 * `textWrap` is a `<Text>`-only style that `Text` sets on its own DOM node,
 * defaulting to `'wrap'` there, with nothing upstream to consult.
 *
 * ## Per-frame cache
 *
 * This runs inside Yoga's measure callback (`applyMeasureFunc`) and again from
 * `paintText` (`render.ts`); Yoga may call a measure function several times per
 * pass while resolving flex sizing, and a deep chain makes each call O(depth).
 * Nothing mutates `textWrap` between layout and paint within a frame — the same
 * invariant `squashTextNodes`'s cache relies on — so the walk is recomputable
 * waste. Same generation-counter shape, for the same reason: a `WeakMap` has no
 * bulk-clear.
 *
 * Every element the walk passes through is cached, not just the starting leaf,
 * so a sibling under the same ancestor chain walks only as far as the nearest
 * cached ancestor — the saving a top-down "resolve once, hand down" pass would
 * give, without threading a parameter through `prepareNode`'s recursion.
 */
export function getTextWrapStyle(element: DOMElement): Styles['textWrap'] {
  const visited: DOMElement[] = [];
  let node: DOMNode | null = element;
  let result: Styles['textWrap'] = 'wrap';

  while (node) {
    if (node.nodeType === DOMNodeType.ELEMENT_NODE) {
      const el = node as DOMElement;
      const cached = textWrapCache.get(el);

      if (cached && cached.generation === textWrapGeneration) {
        result = cached.value;
        break;
      }

      visited.push(el);

      const textWrap = el.attributes?.textWrap;
      if (textWrap !== undefined) {
        result = textWrap;
        break;
      }
    }

    node = node.parentNode;
  }

  for (const el of visited) {
    textWrapCache.set(el, { generation: textWrapGeneration, value: result });
  }

  return result;
}

/**
 * @internal
 *
 * A `<Static>` element's already-flushed children are skipped rather than
 * walked: their content is immutable once flushed and nothing reads their rect
 * again outside a resize, which resets the count first (see `staticFlush.ts`).
 * Without this a long-running `<Static>` log restyles and re-squashes every
 * line it has ever printed, on every frame.
 *
 * Styles are pushed into Yoga only for elements whose attributes actually
 * changed (`yogaStylesDirty`, `DOMElement.ts`, which carries the argument for
 * why that flag is complete). A clean element's Yoga node already holds exactly
 * what reset+apply would write: the pair last ran with the attributes it still
 * has, and nothing else writes its style. Rewriting it anyway is what used to
 * dirty every node in the tree every frame and throw Yoga's own incremental
 * layout away — see [gotchas](../../.agents/docs/gotchas.md).
 */
function prepareNode(node: DOMNode): void {
  const { yogaNode } = node;

  if (!yogaNode) return;

  if (node.nodeType === DOMNodeType.ELEMENT_NODE) {
    const element = node as DOMElement;

    if (element.yogaStylesDirty) {
      // The reset undoes a *previous* application, so on the first one there is
      // nothing to undo and its 52 writes would leave the node exactly as they
      // found it — `initYogaStyles` has already put a new node in the state the
      // reset writes, which `DOMElement.test.ts` pins across all 59 readable
      // properties. See `yogaStylesPristine` for the measurements and for why
      // this is a flag and not a per-write "skip if unchanged" guard.
      if (!element.yogaStylesPristine) resetYogaStyles(yogaNode);

      applyStyles(yogaNode, element.attributes as Styles);
      restrictWrapToRowAxis(yogaNode, element.attributes as Styles);
      element.yogaStylesDirty = false;
      element.yogaStylesPristine = false;
    }

    applyMeasureFunc(element);

    if (isStaticElement(element)) {
      const flushed = readClampedFlushedCount(element);

      for (let index = flushed; index < element.childNodes.length; index++) {
        prepareNode(element.childNodes[index]!);
      }

      return;
    }
  }

  for (const child of node.childNodes) {
    prepareNode(child);
  }
}

/**
 * Confine our `flexWrap: wrap` default (`resetYogaStyles`) to the ROW axis.
 *
 * The divergence from ink pays off only on the row axis, where ink's
 * `flexShrink: 1` squeezes adjacent `<Text>` into garbage
 * (`"hellworld\n\n    again"`) and wrapping at node boundaries reads correctly.
 * On the column axis wrapping starts a *second column* beside the content,
 * surprising and hard to diagnose in a TUI, where ink simply overflows —
 * predictable, and the author can opt into `overflow: hidden`.
 *
 * An explicit `flexWrap` always wins — the author asked for a specific mode.
 *
 * @internal
 */
function restrictWrapToRowAxis(yogaNode: YogaNode, style: Styles): void {
  if ('flexWrap' in style) return;

  const isColumn =
    style.flexDirection === 'column' || style.flexDirection === 'column-reverse';

  if (isColumn) {
    yogaNode.setFlexWrap(Yoga.WRAP_NO_WRAP);
  }
}

/**
 * Give the outermost inline element of a text flow a measure function over the
 * whole flow, squashed into one string.
 *
 * Neither text runs nor nested inline elements own a Yoga node, so this element
 * is everything layout sees of the flow — hence it must measure the squashed
 * subtree, not just its own text runs.
 *
 * @internal
 */
function applyMeasureFunc(element: DOMElement): void {
  const { yogaNode } = element;

  if (!yogaNode) return;

  const text = canMeasureText(element) ? squashTextNodes(element) : '';

  if (!text) {
    yogaNode.setMeasureFunc(null);
    measuredText.delete(element);
    return;
  }

  yogaNode.setMeasureFunc(width => measureElementText(element, text, width));

  // Yoga caches a measure function's result until the node is dirtied, and
  // re-setting the function does NOT dirty it; without this, editing a mounted
  // node's text re-lays-out at the *old* width. `markDirty` is legal only on a
  // leaf with a measure function — the branch we are in. The key is the
  // *squashed* string because a change anywhere in the subtree, including a
  // nested element with no Yoga node to dirty, has to reach this node.
  //
  // The wrap mode is the other half of that key, and for the same reason.
  // `measureElementText` wraps with `getTextWrapStyle`, which cascades from
  // ancestor `<Box>`es, so `<Box text-wrap="truncate">` flipping upstream
  // changes what this node measures to while its own text is untouched. Yoga
  // caches a measurement per node, so dirtying the ancestor does not get this
  // node re-measured — it is looked up from the cache at the same width and
  // never asked again, and the frame is laid out for the old wrap mode while
  // `paintText` paints in the new one.
  const key = `${getTextWrapStyle(element)} ${text}`;

  if (measuredText.get(element) !== key) {
    measuredText.set(element, key);
    yogaNode.markDirty();
  }
}

/**
 * Wrap mode and text each element was last measured with, so we know when to
 * dirty its Yoga node. Weak, so it never keeps a detached element alive.
 *
 * @internal
 */
const measuredText = new WeakMap<DOMElement, string>();

/** @internal */
function measureElementText(
  element: DOMElement,
  text: string,
  width: number,
): { width: number; height: number } {
  const dimensions = measureText(text);

  // Fits as-is, nothing to wrap.
  if (dimensions.width <= width) return dimensions;

  // Yoga probes with a sub-cell width when a parent is shrinking its children.
  // Answer with the natural size — "no, this does not fit" — rather than
  // wrapping into a column of single characters.
  if (dimensions.width >= 1 && width > 0 && width < 1) return dimensions;

  return measureText(wrapText(text, width, getTextWrapStyle(element)));
}

/** @internal */
const measureText = withCache(
  (text: string): { width: number; height: number } => {
    if (text.length === 0) return { width: 0, height: 0 };

    return { width: widestLine(text), height: text.split('\n').length };
  },
);

/** @internal */
function hasOwnWidth(root: LayoutRoot): boolean {
  return (
    root.nodeType === DOMNodeType.ELEMENT_NODE &&
    (root as DOMElement).attributes.width !== undefined
  );
}
