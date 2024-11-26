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
  child.remove();
}

export function setText(node: DOMText, text: string): void {
  node.textContent = text;
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
