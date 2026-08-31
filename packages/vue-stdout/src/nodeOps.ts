import { DOM, type DOMElement, type DOMText } from './tree/DOMTree';
import type { DOMNode } from './tree/DOMTree/DOMNode';

export function patchProp(
  el: DOMElement,
  key: string,
  prevValue: any,
  nextValue: any,
): void {
  if (nextValue === undefined) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, nextValue);
  }
}

export function insert(
  child: DOMNode,
  parent: DOMElement,
  ref?: DOMNode | null,
): void {
  parent.insertBefore(child, ref);
}

export function remove(child: DOMNode): void {
  // `DOMNode#remove()` (src/tree) calls `setRootDocument(null)` and emits
  // nothing itself — unlike `insertBefore`, which emits `DOMChanged` on the
  // root it just attached to. Without this, removing a mounted node (e.g. a
  // `v-for` row shrinking) schedules no reflow, so the removed content stays
  // visible on screen until some unrelated mutation forces one. Capture the
  // root *before* removing — `remove()` nulls `node.root` as part of
  // detaching it.
  const root = child.root;

  // `destroy()`, not `remove()`: every `DOMElement` allocates a Yoga node in
  // its constructor, and `free()` is only reachable through `destroy()`. This
  // is Vue's unmount path and its only caller, so calling `remove()` here
  // leaked one wasm node per unmounted element — unbounded, for the lifetime
  // of the process, on any churning `v-for`.
  //
  // `destroy()` recurses, so the whole removed subtree is freed, not just its
  // root. Vue reorders keyed children with `insert`, never `remove`, so
  // nothing that gets destroyed here is expected to come back.
  child.destroy();

  root?.emit('DOMChanged');
}

export function setText(node: DOMText, text: string): void {
  node.textContent = text;

  // `DOMText#textContent` (src/tree) only stores the value — unlike
  // `DOMElement#textContent`, it doesn't go through `insertBefore` and so
  // never notifies the render tree. Without this, updating a mounted text
  // vnode (e.g. via reactive interpolation) never triggers a reflow.
  node.emitRoot('DOMChanged');
}

export function createElement(tagName: string): DOMElement {
  return DOM.Document.createElement(tagName);
}

export function createComment(text: string): DOMNode {
  return DOM.Document.createComment(text);
}

export function createText(text: string): DOMNode {
  return DOM.Document.createTextNode(text);
}

export function setElementText(el: DOMElement, text: string): void {
  el.textContent = text;
}

export function parentNode(node: DOMNode): DOMElement | null {
  return node.parentNode as DOMElement;
}

export function nextSibling(node: DOMNode): DOMNode | null {
  return node.nextSibling;
}

export function setScopeId(el: DOMNode, id: string): void {
  (el as DOMElement).setAttribute(id, '');
}

export function querySelector(): never {
  throw new Error('querySelector not supported in stdout renderer.');
}
