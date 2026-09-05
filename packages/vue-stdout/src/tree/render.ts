import { EventEmitter } from 'node:events';
import { performance } from 'node:perf_hooks';
import process from 'node:process';
import chalk from 'chalk';
import cliBoxes from 'cli-boxes';
import widestLine from 'widest-line';
import type { DOMDocument } from './DOMTree/DOMDocument';
import type { DOMElement } from './DOMTree/DOMElement';
import { type DOMNode, DOMNodeType } from './DOMTree/DOMNode';
import Layer from './Layer';
import {
  type LayoutRoot,
  computeLayout,
  getComputedRect,
  getContentRect,
  getTextWrapStyle,
  measuresOwnText,
} from './layout';
import { squashTextNodes } from './squashText';
import { staticFlushedCount } from './staticFlush';
import { isStaticElement } from './tags';
import { colorize } from './utils/colorize';
import { textTransformers } from './utils/textTransformers';
import { wrapText } from './utils/wrapText';
import { Yoga } from './yoga';

/**
 * Paint an already-laid-out DOM tree into `layer`.
 *
 * Call `computeLayout(root, width)` first: every coordinate here is read back
 * off the Yoga nodes the DOM already owns. Nothing is allocated, and the only
 * thing mutated is the last-seen rect of those elements that have a `layout` or
 * `resize` subscriber (`syncBoundingClientRect`).
 *
 * `root`'s own border box is placed at the layer origin, so the caller decides
 * where the tree starts by sizing the layer, not by offsetting the tree.
 *
 * `skipStatic` (default `true`, matching ink's `skipStaticElements`) leaves any
 * `<Static>` subtree unpainted here — it is rendered separately, once, by
 * `collectStaticOutput`/`renderStaticElement` and flushed straight to the
 * terminal by `Container`. Pass `false` only when `root` itself *is* that
 * static subtree.
 */
export function renderToLayer(
  root: LayoutRoot,
  layer: Layer,
  options: { skipStatic?: boolean } = {},
): void {
  paintNode(root, 0, 0, layer, options.skipStatic ?? true);
}

/**
 * Lay out and paint `root` at `width` columns, returning the finished frame.
 *
 * Synchronous end to end — `renderToString` depends on that.
 */
export function renderToFrame(root: LayoutRoot, width: number): string {
  computeLayout(root, width);

  const layer = new Layer({ width, height: getComputedRect(root).height });

  renderToLayer(root, layer);
  layer.compute();

  return layer.frame;
}

export interface RendererOptions {
  document: DOMDocument;
  width: number;
  height: number;
  /** See {@link Renderer.canRender}. */
  canRender?: () => boolean;
}

/**
 * Turns DOM mutations into frames.
 *
 * Owns no tree of its own: the Yoga nodes belong to the DOM, so this is only a
 * scheduler plus the `Layer` the frames are painted into.
 */
export class Renderer extends EventEmitter {
  /** @internal */
  readonly document: DOMDocument;

  /** Columns available to the layout root. */
  width: number;

  /** Rows the terminal offers. Reported to consumers; does not clamp output. */
  height: number;

  readonly layer: Layer;

  /** A frame is queued for the next tick. */
  scheduled: boolean = false;

  /**
   * Set by `destroy()`. Read *inside* the scheduled callback, not just when
   * scheduling — see `schedule()`.
   */
  destroyed: boolean = false;

  /**
   * Asked once per scheduled tick, **before** the layout+paint pass, whether a
   * frame may be computed now. Returning `false` skips the whole pass — not
   * just its write — and hands the owner the obligation to call {@link flush}
   * once its reason to wait is over.
   *
   * This is the seam that puts `Container`'s `maxFps` throttle *upstream* of
   * layout and paint, where ink's `throttledOnRender` also sits. Downstream of
   * them — the arrangement this replaced — a 125 Hz source at `maxFps: 30`
   * laid out and painted 400 frames in full to put 104 on screen, spending
   * three quarters of the engine's CPU on frames nobody could ever see.
   *
   * `undefined` rather than defaulted to `() => true`, so a `Renderer` nobody
   * gated is byte-for-byte the scheduler it always was.
   */
  private readonly canRender: (() => boolean) | undefined;

  /**
   * A frame is *owed*: the tree changed, and {@link canRender} declined to
   * compute it. Only {@link flush} (or {@link destroy}, which is the last
   * chance anyone gets) clears it.
   *
   * Deliberately a second flag rather than a reading of {@link scheduled},
   * which means the opposite thing: `scheduled` is work that has not been
   * *offered* yet, this is work that was offered and turned down. `destroy()`
   * treats the two differently and must be able to tell them apart even when
   * both are set.
   *
   * @internal
   */
  private deferred: boolean = false;

  /** @internal */
  private readonly onDOMChanged: () => void;

  constructor({ canRender, document, height, width }: RendererOptions) {
    super();

    this.document = document;
    this.width = width;
    this.height = height;
    this.canRender = canRender;
    this.layer = new Layer({ width, height });

    this.onDOMChanged = () => this.schedule();
    document.on('DOMChanged', this.onDOMChanged);
  }

  /**
   * Lay out and paint synchronously, returning the frame.
   *
   * Also emits `'static'` synchronously, before returning, whenever a mounted
   * `<Static>` has new content (`collectStaticOutput`). `schedule()` emits
   * `'frame'` only after this call returns, so a listener attached to both — as
   * `Container` is — sees static output before the frame it belongs above.
   */
  render(): string {
    if (this.destroyed) return this.layer.frame;

    computeLayout(this.document, this.width);

    const staticOutput = collectStaticOutput(this.document);
    if (staticOutput) this.emit('static', staticOutput);

    this.layer.width = this.width;
    this.layer.height = getComputedRect(this.document).height;

    renderToLayer(this.document, this.layer);
    this.layer.compute();

    return this.layer.frame;
  }

  /**
   * Coalesce this tick's DOM mutations into one frame on the next tick — if
   * {@link canRender} lets the pass run at all.
   *
   * TRAP: the `destroyed` check has to happen **inside** the callback as well
   * as at scheduling time. `unmount()` runs `app.unmount()` and
   * `container.destroy()` in the same tick a frame was queued in, and
   * `destroy()` frees the tree's Yoga nodes — WASM memory. Checking the flag
   * only when queueing leaves the callback laying out over freed pointers. A
   * freed `DOMNode` also nulls its `yogaNode`, but that is a backstop; this
   * flag is the contract: after `destroy()`, no further layout runs.
   *
   * A plain no-op on `destroyed` is enough — `destroy()` already flushes both
   * a still-`scheduled` frame and a `deferred` one synchronously before
   * setting the flag.
   */
  schedule(): void {
    if (this.destroyed || this.scheduled) return;

    this.scheduled = true;

    process.nextTick(() => {
      if (this.destroyed) {
        this.scheduled = false;
        return;
      }

      if (this.canRender && !this.canRender()) {
        this.deferred = true;
        this.scheduled = false;
        return;
      }

      // Cleared ahead of the pass rather than between it and the emit: from
      // here on no tick is queued, which is what a `schedule()` call made from
      // inside the pass — or from a `'frame'` listener — has to see to queue
      // the next one instead of being swallowed.
      this.scheduled = false;
      this.computeFrame();
    });
  }

  /**
   * Compute and emit the frame {@link canRender} turned down, *without* asking
   * it again: the owner is the caller, and it calls precisely because its
   * reason to wait is over (a throttle window closed, console output needs a
   * current frame under it, the app is unmounting).
   *
   * A no-op unless a frame is actually owed, so a trailing edge nothing outran
   * costs nothing.
   *
   * @returns whether a frame was computed and emitted — which is what lets
   * `Container` tell "the newest state has just been repainted" from "there
   * was nothing newer than what is already on screen".
   */
  flush(): boolean {
    if (!this.deferred || this.destroyed) return false;

    this.computeFrame();

    return true;
  }

  /**
   * The layout+paint pass and its `'frame'` emit, timed as ink measures
   * `RenderMetrics.renderTime`: wall-clock around the pass only — a slow
   * terminal write downstream is not "render" time.
   *
   * @internal
   */
  private computeFrame(): void {
    this.deferred = false;

    const startTime = performance.now();
    const frame = this.render();
    const renderTime = performance.now() - startTime;

    this.emit('frame', frame, renderTime);
  }

  /**
   * Stop listening and refuse all further frames. Idempotent.
   *
   * Does not free any Yoga node: they belong to the DOM nodes, and the owner
   * of the document (`Container`) frees them by destroying itself.
   *
   * Work can be outstanding in two different senses when this runs, and they
   * are settled differently — see {@link deferred}.
   *
   * **A frame this class was told to defer is still owed, and this is the last
   * moment it can be computed.** `teardown()` calls this before `app.unmount()`,
   * so the tree is intact and the pass is the ordinary one; after this method
   * nothing can call {@link flush}. That is the guarantee `MountOptions.maxFps`
   * is documented on: a burst still inside its throttle window at exit ends with
   * its final state on screen, not its second-to-last. The pass also emits
   * `'static'`, so a `<Static>` item caught in the same window rides out with it.
   *
   * **Content merely queued for the next tick is not.** `teardown()` can run in
   * the same tick a `DOMChanged` mutation — a `<Static>` item mounted by a
   * `flush: 'post'` watcher, say — scheduled a frame for; the queued `nextTick`
   * callback would find `destroyed` set and silently drop it, losing the item for
   * good. So that case flushes the `<Static>` content and only that, detected by
   * a plain `collectStaticElements` walk with no layout. Ordinary content queued
   * for a tick that never ran is still dropped — a separately tested contract —
   * because it was never offered to the throttle, and rendering unconditionally
   * here would paint content nothing asked to see flushed at teardown.
   */
  destroy(): void {
    if (this.destroyed) return;

    if (this.deferred) {
      this.scheduled = false;
      this.computeFrame();
    } else if (this.scheduled) {
      this.scheduled = false;

      const staticElements: DOMElement[] = [];
      collectStaticElements(this.document, staticElements);

      if (staticElements.length > 0) {
        computeLayout(this.document, this.width);

        const staticOutput = collectStaticOutput(this.document);
        if (staticOutput) this.emit('static', staticOutput);
      }
    }

    this.destroyed = true;
    this.document.off('DOMChanged', this.onDOMChanged);
    this.removeAllListeners('frame');
    this.removeAllListeners('static');
  }
}

/** @internal */
function paintNode(
  node: DOMNode,
  x: number,
  y: number,
  layer: Layer,
  skipStatic: boolean,
): void {
  if (node.nodeType !== DOMNodeType.ELEMENT_NODE) {
    paintChildren(node, x, y, layer, skipStatic);
    return;
  }

  const element = node as DOMElement;

  // A `<Static>` root is painted separately (`renderStaticElement`) and flushed
  // straight to the terminal, never through this repeated frame.
  if (skipStatic && isStaticElement(element)) return;

  // Yoga gives a `display: none` subtree a zero-sized box rather than removing
  // it, so it must be skipped here too or its borders paint at zero width. ink
  // does the same.
  if (element.attributes.display === 'none') return;

  syncBoundingClientRect(element);

  const clipped = paintBox(element, x, y, layer);

  if (measuresOwnText(element)) {
    paintText(element, x, y, layer);
  } else {
    paintChildren(element, x, y, layer, skipStatic);
  }

  // Pop the clip once this element's subtree is painted, so it does not leak
  // onto everything written after it in document order.
  if (clipped) layer.unclip();
}

/** @internal */
function paintChildren(
  node: DOMNode,
  x: number,
  y: number,
  layer: Layer,
  skipStatic: boolean,
): void {
  for (const child of node.childNodes) {
    // Text and comment nodes own no Yoga node, so no box. Their content is
    // painted by the inline element that measured it (`paintText`); walking
    // into them here would place them at the parent's origin with no size.
    if (!child.yogaNode) continue;

    const rect = getComputedRect(child);

    paintNode(child, x + rect.x, y + rect.y, layer, skipStatic);
  }
}

/**
 * Collect and render every not-yet-flushed `<Static>` child under `root`, in
 * document order, joined with `\n`.
 *
 * Called once per frame, alongside (not instead of) the ordinary paint: a
 * `<Static>` subtree is still laid out by the same `computeLayout` pass as
 * everything else, it is just never painted into the repeated frame
 * (`skipStatic` above).
 *
 * Returns `''` when there is nothing new to flush. See `staticFlushedCount`.
 */
export function collectStaticOutput(root: LayoutRoot): string {
  const elements: DOMElement[] = [];
  collectStaticElements(root, elements);

  const parts: string[] = [];

  for (const element of elements) {
    const previouslyFlushed = staticFlushedCount.get(element) ?? 0;

    // Clamp down on shrink — see the doc comment on `staticFlushedCount` for
    // the silent-forever-loss failure this guards against.
    const flushed = Math.min(previouslyFlushed, element.childNodes.length);
    const newChildren = element.childNodes.slice(flushed);

    if (newChildren.length === 0) {
      // Persist the clamp even with nothing new to show for it: forgetting a
      // shrink leaves the *next* call clamping against the stale, larger count.
      if (flushed !== previouslyFlushed) staticFlushedCount.set(element, flushed);
      continue;
    }

    // Marked flushed up front, not after a successful render: a child that
    // paints to nothing (an empty `<Text>`) must still count as seen, as ink's
    // index-based consumption does.
    staticFlushedCount.set(element, element.childNodes.length);

    for (const child of newChildren) {
      if (child.nodeType !== DOMNodeType.ELEMENT_NODE) continue;

      const text = renderStaticElement(child as DOMElement);
      if (text) parts.push(text);
    }
  }

  return parts.join('\n');
}

/**
 * Whether a {@link collectStaticOutput} call would find anything new to flush —
 * the same comparison it makes, without the layout, the paint, or the
 * bookkeeping.
 *
 * Exists for the `maxFps` gate (`Container`'s `canComputeFrame`). `<Static>`
 * content does not exist until the pass that produces it has run, so a throttle
 * sitting *ahead* of that pass must know whether this frame carries any before
 * deciding to skip it — otherwise permanent, scroll-into-history output waits on
 * a window it is supposed to bypass. ink asks the same question through its
 * reconciler's `isStaticDirty` flag, routing that commit to `onImmediateRender`
 * instead of the throttled `onRender`.
 *
 * A walk rather than a dirty flag maintained where static children are inserted,
 * because {@link resetStaticFlushCounts} makes content unflushed again with no
 * insertion behind it at all, and a flag every writer of `staticFlushedCount`
 * must remember to set is one some future writer will not. This reads the two
 * numbers `collectStaticOutput` itself compares, so they cannot drift apart. It
 * never descends into a `<Static>` box, whose children are the many.
 */
export function hasPendingStaticOutput(root: LayoutRoot): boolean {
  const elements: DOMElement[] = [];
  collectStaticElements(root, elements);

  for (const element of elements) {
    // `!==`, not `>`. Growth is the obvious case: there is new content to
    // print. A *shrink* prints nothing, and still needs the pass, because
    // `collectStaticOutput` is the only writer of `staticFlushedCount` and it
    // is where the count gets clamped back down to the new child count. A
    // shrink no pass ever observes leaves that count stranded above the
    // children — which is the silent-forever-loss `staticFlush.ts` documents,
    // reintroduced by way of the throttle: the next item to land inside the
    // stranded range would never be printed at all.
    if (element.childNodes.length !== (staticFlushedCount.get(element) ?? 0)) {
      return true;
    }
  }

  return false;
}

/**
 * Forget every `<Static>` element's flushed count under `root`, so the next
 * `collectStaticOutput` call treats all of their already-printed children as
 * new again and re-flushes them.
 *
 * For a terminal resize: `Container#onResize` writes `ansiEscapes.clearTerminal`,
 * wiping whatever `<Static>` content had scrolled into place. Without this,
 * `staticFlushedCount` still remembers those children as printed and
 * `collectStaticOutput` never emits them again — gone from the screen *and*
 * unrecoverable. Called before the next scheduled render, this makes `<Static>`
 * survive a resize as it does in ink.
 */
export function resetStaticFlushCounts(root: LayoutRoot): void {
  const elements: DOMElement[] = [];
  collectStaticElements(root, elements);

  for (const element of elements) {
    staticFlushedCount.delete(element);
  }
}

/** @internal */
function collectStaticElements(node: DOMNode, results: DOMElement[]): void {
  if (node.nodeType === DOMNodeType.ELEMENT_NODE) {
    const element = node as DOMElement;

    if (isStaticElement(element)) {
      results.push(element);
      // Not descending: a `<Static>` root's content is painted whole by
      // `renderStaticElement`, and nesting `<Static>` is unsupported (ink does
      // not special-case it either).
      return;
    }
  }

  for (const child of node.childNodes) {
    collectStaticElements(child, results);
  }
}

/**
 * Render one already-laid-out element to its own string, independent of the
 * rest of the tree. Used by `collectStaticOutput` on each not-yet-flushed child
 * of a `<Static>` box — `element` here is one *item*, not the box itself —
 * which is what ends up written straight to the terminal.
 *
 * `skipStatic: false` is passed explicitly: this item must be painted, not
 * skipped as a static root would be.
 *
 * @internal
 */
function renderStaticElement(element: DOMElement): string {
  const rect = getComputedRect(element);

  if (rect.width <= 0 || rect.height <= 0) return '';

  const layer = new Layer({ width: rect.width, height: rect.height });

  renderToLayer(element, layer, { skipStatic: false });
  layer.compute();

  return layer.frame;
}

/**
 * Fire this element's `layout` event (see `useBoxMetrics`) and, when its size
 * moved, its `resize` event (see `useContainerSize`).
 *
 * `layout` always fires: position moves as often as size does (a sibling
 * growing shifts everything after it without resizing any of it) and nothing
 * about *this* element tells you whether that happened. `resize` is narrower on
 * purpose — only a size change — because `useContainerSize`, its only other
 * subscriber, has no use for a wake-up on a pure position shift.
 *
 * Skipped entirely for an element nothing subscribes to, which is nearly all of
 * them. The cost avoided is **not** the events: `emit` with no listeners
 * measures 16 ns, 0.016 ms for 1 001 elements. It is `getContentRect`, twelve
 * Yoga getters across the WASM boundary per element per frame, ~1.0 µs each —
 * measured at −33 % of a large-grid frame and −55 % of a deep-tree frame once
 * the per-frame style walk was gone. `getBoundingClientRect()` no longer depends
 * on this running (`DOMNode.ts`), so all the gate can withhold is an event
 * nobody asked for.
 *
 * @internal
 */
function syncBoundingClientRect(element: DOMElement): void {
  if (
    element.listenerCount('layout') === 0 &&
    element.listenerCount('resize') === 0
  ) {
    return;
  }

  const rect = getContentRect(element);
  const previous = element.computedBoundingClientRect;

  element.computedBoundingClientRect = rect;

  if (previous.width !== rect.width || previous.height !== rect.height) {
    element.emit('resize');
  }

  element.emit('layout');
}

/** @internal */
function paintText(
  element: DOMElement,
  x: number,
  y: number,
  layer: Layer,
): void {
  // The same string the measure function sized this element with — see
  // `applyMeasureFunc`. Anything else here would paint at the wrong width.
  let text = squashTextNodes(element);

  if (!text) return;

  const rect = getComputedRect(element);
  const content = getContentRect(element);

  // Both rects are relative to the same parent, so their difference is this
  // element's own border+padding inset — turning the border-box origin we were
  // handed into a content-box origin.
  const textX = x + (content.x - rect.x);
  const textY = y + (content.y - rect.y);

  if (widestLine(text) > content.width) {
    text = wrapText(text, content.width, getTextWrapStyle(element));
  }

  layer.write(textX, textY, text, { transformers: textTransformers(element) });
}

/**
 * Fill the element's content area (border box less its own border, not its
 * padding) with `backgroundColor`, one colorized blank line per row.
 *
 * Ports ink's `render-background.ts` unchanged: only border is subtracted, not
 * padding (matching `paintText`'s content rect would double-subtract it), and
 * it must paint before children — `paintBox` calls this ahead of the border and
 * of `paintNode`'s children, so anything drawn later overwrites the fill
 * cell-for-cell.
 *
 * Letting a `<Text>` descendant's own glyphs carry this color is a separate
 * mechanism, ported as `getInheritedBackgroundColor` (`utils/textTransformers.ts`).
 *
 * @internal
 */
function paintBackground(
  element: DOMElement,
  x: number,
  y: number,
  width: number,
  height: number,
  layer: Layer,
): void {
  const props = element.attributes ?? {};

  if (!props.backgroundColor) return;

  const leftBorderWidth =
    props.borderStyle && props.borderLeft !== false ? 1 : 0;
  const rightBorderWidth =
    props.borderStyle && props.borderRight !== false ? 1 : 0;
  const topBorderHeight =
    props.borderStyle && props.borderTop !== false ? 1 : 0;
  const bottomBorderHeight =
    props.borderStyle && props.borderBottom !== false ? 1 : 0;

  const contentWidth = width - leftBorderWidth - rightBorderWidth;
  const contentHeight = height - topBorderHeight - bottomBorderHeight;

  if (!(contentWidth > 0 && contentHeight > 0)) return;

  const backgroundLine = colorize(
    ' '.repeat(contentWidth),
    props.backgroundColor,
    'background',
  );

  for (let row = 0; row < contentHeight; row++) {
    layer.write(x + leftBorderWidth, y + topBorderHeight + row, backgroundLine, {
      transformers: [],
    });
  }
}

/**
 * Draw the element's border and push its overflow clip.
 *
 * Returns whether a clip was pushed, so the caller can pop it after the
 * subtree is painted.
 *
 * @internal
 */
function paintBox(
  element: DOMElement,
  x: number,
  y: number,
  layer: Layer,
): boolean {
  const { yogaNode } = element;
  const props = element.attributes ?? {};
  const { width, height } = getComputedRect(element);

  paintBackground(element, x, y, width, height, layer);

  if (props.borderStyle) {
    const box =
      typeof props.borderStyle === 'string'
        ? (cliBoxes as any)[props.borderStyle]
        : props.borderStyle;

    const topBorderColor = props.borderTopColor ?? props.borderColor;
    const bottomBorderColor = props.borderBottomColor ?? props.borderColor;
    const leftBorderColor = props.borderLeftColor ?? props.borderColor;
    const rightBorderColor = props.borderRightColor ?? props.borderColor;

    const topBorderBackgroundColor =
      props.borderTopBackgroundColor ?? props.borderBackgroundColor;

    const bottomBorderBackgroundColor =
      props.borderBottomBackgroundColor ?? props.borderBackgroundColor;

    const leftBorderBackgroundColor =
      props.borderLeftBackgroundColor ?? props.borderBackgroundColor;

    const rightBorderBackgroundColor =
      props.borderRightBackgroundColor ?? props.borderBackgroundColor;

    const dimTopBorderColor = props.borderTopDimColor ?? props.borderDimColor;

    const dimBottomBorderColor =
      props.borderBottomDimColor ?? props.borderDimColor;

    const dimLeftBorderColor = props.borderLeftDimColor ?? props.borderDimColor;

    const dimRightBorderColor =
      props.borderRightDimColor ?? props.borderDimColor;

    const showTopBorder = props.borderTop !== false;
    const showBottomBorder = props.borderBottom !== false;
    const showLeftBorder = props.borderLeft !== false;
    const showRightBorder = props.borderRight !== false;

    const contentWidth =
      width - (showLeftBorder ? 1 : 0) - (showRightBorder ? 1 : 0);

    let topBorder = showTopBorder
      ? colorize(
          colorize(
            (showLeftBorder ? box.topLeft : '') +
              box.top.repeat(contentWidth) +
              (showRightBorder ? box.topRight : ''),
            topBorderColor,
            'foreground',
          ),
          topBorderBackgroundColor,
          'background',
        )
      : undefined;

    if (showTopBorder && dimTopBorderColor) {
      topBorder = chalk.dim(topBorder);
    }

    let verticalBorderHeight = height;

    if (showTopBorder) {
      verticalBorderHeight -= 1;
    }

    if (showBottomBorder) {
      verticalBorderHeight -= 1;
    }

    let leftBorder = (
      colorize(
        colorize(box.left, leftBorderColor, 'foreground'),
        leftBorderBackgroundColor,
        'background',
      ) + '\n'
    ).repeat(verticalBorderHeight);

    if (dimLeftBorderColor) {
      leftBorder = chalk.dim(leftBorder);
    }

    let rightBorder = (
      colorize(
        colorize(box.right, rightBorderColor, 'foreground'),
        rightBorderBackgroundColor,
        'background',
      ) + '\n'
    ).repeat(verticalBorderHeight);

    if (dimRightBorderColor) {
      rightBorder = chalk.dim(rightBorder);
    }

    let bottomBorder = showBottomBorder
      ? colorize(
          colorize(
            (showLeftBorder ? box.bottomLeft : '') +
              box.bottom.repeat(contentWidth) +
              (showRightBorder ? box.bottomRight : ''),
            bottomBorderColor,
            'foreground',
          ),
          bottomBorderBackgroundColor,
          'background',
        )
      : undefined;

    if (showBottomBorder && dimBottomBorderColor) {
      bottomBorder = chalk.dim(bottomBorder);
    }

    const offsetY = showTopBorder ? 1 : 0;

    if (topBorder) {
      layer.write(x, y, topBorder, { transformers: [] });
    }

    if (showLeftBorder) {
      layer.write(x, y + offsetY, leftBorder, { transformers: [] });
    }

    if (showRightBorder) {
      layer.write(x + width - 1, y + offsetY, rightBorder, {
        transformers: [],
      });
    }

    if (bottomBorder) {
      layer.write(x, y + height - 1, bottomBorder, { transformers: [] });
    }
  }

  const clipHorizontally =
    props.overflowX === 'hidden' || props.overflow === 'hidden';

  const clipVertically =
    props.overflowY === 'hidden' || props.overflow === 'hidden';

  if ((!clipHorizontally && !clipVertically) || !yogaNode) return false;

  const x1 = clipHorizontally
    ? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
    : undefined;

  const x2 = clipHorizontally
    ? x + width - yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
    : undefined;

  const y1 = clipVertically
    ? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
    : undefined;

  const y2 = clipVertically
    ? y + height - yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
    : undefined;

  layer.clip({ x1, x2, y1, y2 });

  return true;
}
