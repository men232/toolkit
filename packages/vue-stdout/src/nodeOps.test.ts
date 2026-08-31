import { describe, expect, it, vi } from 'vitest';
import { patchProp, remove } from './nodeOps';
import { DOM, type DOMElement } from './tree/DOMTree';

const el = (tag: string, kids: DOMElement[] = []) => {
  const node = DOM.createElement(tag);
  for (const kid of kids) node.appendChild(kid);
  return node;
};

describe('nodeOps.remove', () => {
  // Every DOMElement allocates a Yoga (wasm) node in its constructor, and
  // `free()` is reachable only through `destroy()`. Vue's unmount path is the
  // only caller of `remove`, so if it does not free, a churning `v-for` leaks
  // one wasm node per removed element for the lifetime of the process.

  it('frees the Yoga node of the removed element', () => {
    const doc = DOM.createDocument();
    const node = el('stdout-box');
    doc.appendChild(node);

    const free = vi.spyOn(node.yogaNode!, 'free');

    remove(node);

    expect(free).toHaveBeenCalledTimes(1);
    expect(node.yogaNode).toBeNull();
  });

  it('frees the whole removed subtree, not just its root', () => {
    // Deliberately two siblings at each level: a `forEach` over the live
    // `childNodes` array while `destroy()` splices from it skips every other
    // child, which is exactly the leak this engine has already paid for once.
    const doc = DOM.createDocument();

    const grandchildren = [el('stdout-text'), el('stdout-text'), el('stdout-text'), el('stdout-text')];
    const children = [
      el('stdout-box', [grandchildren[0], grandchildren[1]]),
      el('stdout-box', [grandchildren[2], grandchildren[3]]),
    ];
    const root = el('stdout-box', children);
    doc.appendChild(root);

    const subtree = [root, ...children, ...grandchildren];
    const frees = subtree.map(n => vi.spyOn(n.yogaNode!, 'free'));

    remove(root);

    for (const free of frees) expect(free).toHaveBeenCalledTimes(1);
    for (const node of subtree) expect(node.yogaNode).toBeNull();
  });

  it('detaches the removed element from its parent Yoga node', () => {
    const doc = DOM.createDocument();
    const kept = el('stdout-box');
    const dropped = el('stdout-box');
    doc.appendChild(kept);
    doc.appendChild(dropped);

    expect(doc.yogaNode.getChildCount()).toBe(2);

    remove(dropped);

    expect(doc.yogaNode.getChildCount()).toBe(1);
    expect(doc.childNodes).toEqual([kept]);
  });

  it('still notifies the document so a reflow is scheduled', () => {
    const doc = DOM.createDocument();
    const node = el('stdout-box');
    doc.appendChild(node);

    const onChange = vi.fn();
    doc.on('DOMChanged', onChange);

    remove(node);

    expect(onChange).toHaveBeenCalled();
  });
});

describe('nodeOps.patchProp', () => {
  // `DOMElement#setAttribute` emits `DOMChanged` directly above
  // `removeAttribute` (`src/tree/DOMTree/DOMElement.ts`), but removal used to
  // skip it -- so `<Box :width="wide ? 20 : undefined">` flipping `wide` to
  // `false` removed the attribute and scheduled no reflow, leaving the box
  // stuck at its old width on screen until some unrelated mutation forced a
  // frame. Mirrors `nodeOps.remove`'s "still notifies" case above.
  it('still notifies the document when an attribute is removed', () => {
    const doc = DOM.createDocument();
    const node = el('stdout-box');
    doc.appendChild(node);

    patchProp(node, 'width', 20, 20);

    const onChange = vi.fn();
    doc.on('DOMChanged', onChange);

    patchProp(node, 'width', 20, undefined);

    expect(node.getAttribute('width')).toBeUndefined();
    expect(onChange).toHaveBeenCalled();
  });
});
