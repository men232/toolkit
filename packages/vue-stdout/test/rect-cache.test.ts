import { describe, expect, it } from 'vitest';
import { insert, patchProp, remove, setText } from '../src/nodeOps';
import { DOM, type DOMElement, type DOMText } from '../src/tree/DOMTree';
import { computeLayout } from '../src/tree/layout';
import { renderToFrame } from '../src/tree/render';

/**
 * `getComputedRect`/`getContentRect` memoise their Yoga reads per layout pass
 * (`src/tree/DOMTree/DOMNode.ts`). One paint reads the same element's rect
 * about three times, and each read was four JS↔WASM crossings.
 *
 * The memo's invalidation surface is one input — **`calculateLayout` ran** —
 * because Yoga's computed values are frozen between layout passes. Everything
 * that can move a rect has to move it *through* a layout pass, so this file is
 * one case per way a rect can change, each mutating an already-framed tree and
 * asserting the next read moved. All of them were seen red against
 * `beginRectFrame()` removed from `computeLayout`.
 *
 * Two inputs do not go through a layout pass and are held separately: a Yoga
 * node **replaced** by `updateYogaOwnership`, and a node whose Yoga node is
 * **gone** after `destroy()`. Both are read here without an intervening frame,
 * because that is the only window in which they can be wrong.
 *
 * Reads go through `getBoundingClientRect()` as well as through the frame
 * string on purpose: the public read must not become a paint-walk artefact
 * again. It is what `useContainerSize` calls, directly, from a watcher.
 */
describe('per-frame rect memo', () => {
  const box = () => DOM.Document.createElement('stdout-box');
  const text = () => DOM.Document.createElement('stdout-text');

  /**
   * A column of two fixed boxes under a root, already framed once so every
   * rect memo is filled before the test mutates anything.
   */
  const mount = () => {
    const document = DOM.Document.createDocument();
    const root = box();
    root.setAttribute('flexDirection', 'column');

    const first = box();
    first.setAttribute('width', 10);
    first.setAttribute('height', 2);

    const second = box();
    second.setAttribute('width', 10);
    second.setAttribute('height', 1);

    root.appendChild(first);
    root.appendChild(second);
    document.appendChild(root);

    renderToFrame(document, 40);

    return { document, root, first, second };
  };

  const frame = (document: DOMElement | ReturnType<typeof mount>['document']) =>
    renderToFrame(document as never, 40);

  it('follows a change in the available width', () => {
    const { document, root } = mount();
    expect(root.getBoundingClientRect().width).toBe(40);

    renderToFrame(document, 20);
    expect(root.getBoundingClientRect().width).toBe(20);
  });

  it("follows a change in the element's own styles", () => {
    const { document, first } = mount();
    expect(first.getBoundingClientRect()).toMatchObject({ width: 10, height: 2 });

    first.setAttribute('width', 25);
    frame(document);

    expect(first.getBoundingClientRect().width).toBe(25);
  });

  it('follows a change in an ancestor style the element inherits nothing from', () => {
    const { document, root, first } = mount();
    expect(first.getBoundingClientRect()).toMatchObject({ x: 0, y: 0 });

    // Cascades onto the child's *position* without touching the child at all.
    root.setAttribute('paddingLeft', 4);
    root.setAttribute('paddingTop', 3);
    frame(document);

    expect(first.getBoundingClientRect()).toMatchObject({ x: 4, y: 3 });
  });

  it('follows a sibling being inserted before it', () => {
    const { document, root, second } = mount();
    expect(second.getBoundingClientRect().y).toBe(2);

    const spacer = box();
    spacer.setAttribute('height', 5);
    root.insertBefore(spacer, second);
    frame(document);

    expect(second.getBoundingClientRect().y).toBe(7);
  });

  it('follows a sibling being removed', () => {
    const { document, first, second } = mount();
    expect(second.getBoundingClientRect().y).toBe(2);

    remove(first);
    frame(document);

    expect(second.getBoundingClientRect().y).toBe(0);
  });

  it('follows the text a measuring element grows to hold', () => {
    const document = DOM.Document.createDocument();
    const root = box();
    const label = text();
    const runs = DOM.Document.createTextNode('ab') as DOMText;

    insert(runs, label);
    insert(label, root);
    insert(root, document as never);

    frame(document);
    expect(label.getBoundingClientRect()).toMatchObject({ width: 2, height: 1 });

    setText(runs, 'abcdef');
    frame(document);

    expect(label.getBoundingClientRect().width).toBe(6);
  });

  it("follows an ancestor's textWrap, which is not a Yoga style at all", () => {
    const document = DOM.Document.createDocument();
    const outer = box();
    outer.setAttribute('width', 6);

    const label = text();
    insert(DOM.Document.createTextNode('aaa bbb ccc') as DOMText, label);
    insert(label, outer);
    insert(outer, document as never);

    frame(document);
    // Wrapped over three rows by default.
    expect(label.getBoundingClientRect().height).toBe(3);

    // `textWrap` cascades from ancestor `<Box>`es and is not pushed into Yoga,
    // so the only thing that can move this rect is the re-measure the next
    // layout pass performs.
    outer.setAttribute('textWrap', 'truncate');
    frame(document);

    expect(label.getBoundingClientRect().height).toBe(1);
  });

  it('reports a rect after a layout pass that painted nothing at all', () => {
    const { document, first } = mount();

    // No paint, no subscriber, no `syncBoundingClientRect`: `computeLayout` on
    // its own. `getBoundingClientRect()` is what `useContainerSize` calls from
    // a watcher, and gating the paint-walk refresh once made it serve whatever
    // that walk had last cached. A memo filled only by painting would put it
    // straight back.
    expect(first.listenerCount('layout')).toBe(0);

    first.setAttribute('width', 7);
    computeLayout(document, 40);

    expect(first.getBoundingClientRect().width).toBe(7);
  });

  it('forgets the old rect when an element is handed a fresh Yoga node', () => {
    const document = DOM.Document.createDocument();
    const root = box();
    const label = text();
    insert(DOM.Document.createTextNode('ab') as DOMText, label);
    insert(label, root);
    insert(root, document as never);

    const inner = text();
    patchProp(inner, 'paddingLeft', undefined, 4);
    insert(DOM.Document.createTextNode('cd') as DOMText, inner);

    // Framed as a sibling first, so it owns a node and its rect memo is filled.
    insert(inner, root);
    frame(document);
    expect(inner.getBoundingClientRect().width).toBe(2);

    // Nested inside a `<Text>`, it becomes virtual and its Yoga node is freed.
    insert(inner, label);
    // Back out again: a *fresh*, never-laid-out node. No layout pass has run
    // since, so `beginRectFrame` cannot have cleared anything — only
    // `updateYogaOwnership` can, and Yoga's answer for an unlaid-out node is
    // `NaN`, normalised to zero.
    insert(inner, root);

    expect(inner.getBoundingClientRect()).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it('reports zeros for a destroyed element rather than its last rect', () => {
    const { first } = mount();
    expect(first.getBoundingClientRect().width).toBe(10);

    // `destroy()` frees the Yoga node and nulls it. The missing-node guard has
    // to sit ahead of the memo, or this reads back a rect belonging to memory
    // that is no longer ours.
    first.destroy();

    expect(first.getBoundingClientRect()).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});
