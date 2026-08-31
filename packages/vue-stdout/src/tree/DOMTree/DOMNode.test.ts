import { describe, expect, it } from 'vitest';
import { renderToFrame } from '../render';
import { DOM } from '.';
import type { DOMDocument } from './DOMDocument';
import type { DOMElement } from './DOMElement';
import type { DOMNode } from './DOMNode';

const line = (element: DOMElement, text: string) => {
  const row = DOM.createElement('stdout-text');
  row.appendChild(DOM.createTextNode(text));
  element.appendChild(row);
  return row;
};

/** Every node at or below `node`, in document order. */
const subtree = (node: DOMNode): DOMNode[] => [
  node,
  ...node.childNodes.flatMap(subtree),
];

/** The distinct `root` values across a whole subtree. */
const roots = (node: DOMNode): Array<DOMDocument | null> => [
  ...new Set(subtree(node).map(child => child.root)),
];

/**
 * `setRootDocument` stops walking as soon as it finds a node that already
 * holds the root it is being handed, which is only sound because **a node's
 * subtree always shares its root**. Nothing else may write `root`, and every
 * path that changes one — attach, detach, move, destroy — has to leave the
 * whole subtree agreeing.
 *
 * That invariant is what these pin. They are not testing the shortcut (a
 * shortcut that never fires passes all of them); they are testing the property
 * that makes it safe, so that a future change which breaks the property fails
 * here rather than silently leaving half a subtree unable to schedule a frame.
 *
 * The property is not academic. Vue mounts bottom-up — it builds an element's
 * children into it and only then inserts the element into its parent — so a
 * mounted tree is assembled almost entirely while detached, and every one of
 * those insertions is a case where an ancestor's root and a descendant's have
 * to be made to agree.
 */
describe('DOMNode#setRootDocument', () => {
  /** Vue's mount order: children into the element, then the element upward. */
  const buildBottomUp = (depth: number) => {
    let node = DOM.createElement('stdout-box');
    node.appendChild(DOM.createTextNode('leaf'));

    for (let index = 0; index < depth; index++) {
      const parent = DOM.createElement('stdout-box');
      parent.appendChild(DOM.createComment(`c${index}`));
      parent.appendChild(node);
      node = parent;
    }

    return node;
  };

  it('reaches every node of a subtree that was assembled before it was attached', () => {
    const document = DOM.createDocument();
    const tree = buildBottomUp(20);

    // Nothing is attached yet, so every node agrees on "no document".
    expect(roots(tree)).toEqual([null]);

    document.appendChild(tree);

    expect(roots(tree)).toEqual([document]);
    expect(subtree(tree).length).toBe(42);
  });

  it('clears every node of a subtree when it is detached, and restores them all when it comes back', () => {
    const document = DOM.createDocument();
    const box = DOM.createElement('stdout-box');
    const tree = buildBottomUp(20);

    document.appendChild(box);
    box.appendChild(tree);
    expect(roots(tree)).toEqual([document]);

    tree.remove();
    expect(roots(tree)).toEqual([null]);

    box.appendChild(tree);
    expect(roots(tree)).toEqual([document]);
  });

  it('keeps the whole subtree on the document when it moves between parents inside it', () => {
    const document = DOM.createDocument();
    const from = DOM.createElement('stdout-box');
    const to = DOM.createElement('stdout-box');
    const tree = buildBottomUp(20);

    document.appendChild(from);
    document.appendChild(to);
    from.appendChild(tree);

    to.appendChild(tree);

    expect(tree.parentNode).toBe(to);
    expect(roots(tree)).toEqual([document]);
  });

  it('adopts a subtree that was hanging off a detached parent', () => {
    const document = DOM.createDocument();
    const detached = DOM.createElement('stdout-box');
    const tree = buildBottomUp(20);
    detached.appendChild(tree);

    expect(roots(detached)).toEqual([null]);

    document.appendChild(detached);

    expect(roots(detached)).toEqual([document]);
  });

  it('leaves a deep descendant able to schedule a frame after a bottom-up mount', () => {
    // The consequence, not the mechanism: `emitRoot` is how a mutation reaches
    // the renderer, and it reads `root`. A node the walk failed to reach paints
    // once and then never updates again.
    const document = DOM.createDocument();
    const tree = buildBottomUp(20);
    document.appendChild(tree);

    let changes = 0;
    document.on('DOMChanged', () => changes++);

    const deepest = subtree(tree).at(-1)!;
    deepest.emitRoot('DOMChanged');
    deepest.parentNode!.appendChild(DOM.createTextNode('more'));

    expect(changes).toBe(2);
  });
});

/**
 * `linkYogaChild` places a child in the parent's Yoga child list, which is the
 * subsequence of `childNodes` that owns Yoga nodes — so the index it needs is
 * *not* the DOM index whenever a text or comment child sits in between.
 *
 * It works that index out by scanning `childNodes`, which makes filling a list
 * by appending O(n²), and takes an O(1) shortcut — Yoga's own child count —
 * once the list is longer than `YOGA_INDEX_SCAN_LIMIT`. These pin the
 * shortcut's premise: that Yoga's count and the scan agree.
 *
 * Every case here deliberately runs past that limit and mixes in children that
 * own no Yoga node, because a shortcut that quietly used the DOM index instead
 * would be right on any list of pure elements and wrong the moment one comment
 * appears.
 */
describe('DOMNode#linkYogaChild', () => {
  /** Comfortably past the 64-child threshold. */
  const COUNT = 100;

  it('keeps rows in order in a long list interleaved with node-less children', () => {
    const document = DOM.createDocument();
    const box = DOM.createElement('stdout-box');
    box.setAttribute('flexDirection', 'column');
    document.appendChild(box);

    for (let index = 0; index < COUNT; index++) {
      // A comment before every row, so the Yoga index runs at half the DOM
      // index and the two can never be confused for one another.
      box.appendChild(DOM.createComment(`c${index}`));
      line(box, `row ${index}`);
    }

    const frame = renderToFrame(document, 20).split('\n');

    expect(frame.slice(0, COUNT)).toEqual(
      Array.from({ length: COUNT }, (_, index) => `row ${index}`),
    );
  });

  it('keeps rows in order when a long list is built by inserting before a ref', () => {
    // The other branch: never an append, so the shortcut must not fire at all.
    const document = DOM.createDocument();
    const box = DOM.createElement('stdout-box');
    box.setAttribute('flexDirection', 'column');
    document.appendChild(box);

    const last = line(box, `row ${COUNT - 1}`);

    for (let index = COUNT - 2; index >= 0; index--) {
      const row = DOM.createElement('stdout-text');
      row.appendChild(DOM.createTextNode(`row ${index}`));
      box.insertBefore(row, box.firstChild);
      box.insertBefore(DOM.createComment(`c${index}`), row);
    }

    expect(box.lastChild).toBe(last);

    const frame = renderToFrame(document, 20).split('\n');

    expect(frame.slice(0, COUNT)).toEqual(
      Array.from({ length: COUNT }, (_, index) => `row ${index}`),
    );
  });

  it('keeps rows in order after a child is moved to the end of a long list', () => {
    // Vue reorders keyed children with `insert`, never `remove` + `insert`, and
    // a move to the end is an append into a list the child is already in --
    // where the shortcut fires and the count has just dropped by one.
    const document = DOM.createDocument();
    const box = DOM.createElement('stdout-box');
    box.setAttribute('flexDirection', 'column');
    document.appendChild(box);

    const rows: DOMElement[] = [];
    for (let index = 0; index < COUNT; index++) {
      box.appendChild(DOM.createComment(`c${index}`));
      rows.push(line(box, `row ${index}`));
    }

    box.appendChild(rows[0]!);

    const frame = renderToFrame(document, 20).split('\n');

    expect(frame.slice(0, COUNT)).toEqual([
      ...Array.from({ length: COUNT - 1 }, (_, index) => `row ${index + 1}`),
      'row 0',
    ]);
  });

  it('keeps rows in order when a long list is adopted by an element regaining a Yoga node', () => {
    // `updateYogaOwnership`'s relink loop is the one place the subsequence
    // invariant is *being rebuilt* rather than held, so it is the one place the
    // shortcut could read a count that is not yet the answer.
    const document = DOM.createDocument();
    const outer = DOM.createElement('stdout-text');
    const inner = DOM.createElement('stdout-text');
    const box = DOM.createElement('stdout-box');
    box.setAttribute('flexDirection', 'column');
    document.appendChild(box);

    // While `inner` sits inside another inline element it owns no Yoga node,
    // so none of its children get linked as they are added.
    outer.appendChild(inner);
    inner.setAttribute('flexDirection', 'column');

    for (let index = 0; index < COUNT; index++) {
      inner.appendChild(DOM.createComment(`c${index}`));

      // Boxes, not `stdout-text`: an inline element nested in an inline one is
      // virtual text and owns no Yoga node of its own, so it would never be
      // relinked and the loop under test would have nothing to do.
      const row = DOM.createElement('stdout-box');
      line(row, `row ${index}`);
      inner.appendChild(row);
    }

    expect(inner.yogaNode).toBeNull();

    // Moving it under a box gives it a fresh Yoga node and relinks all COUNT*2
    // children in one loop.
    box.appendChild(inner);

    expect(inner.yogaNode!.getChildCount()).toBe(COUNT);

    const frame = renderToFrame(document, 20).split('\n');

    expect(frame.slice(0, COUNT)).toEqual(
      Array.from({ length: COUNT }, (_, index) => `row ${index}`),
    );
  });
});
