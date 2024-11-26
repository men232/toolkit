import { NodeTree } from '../NodeTree';
import type { DOMDocument } from './DOMDocument';

let nodeId: number = 0;

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

  /** @internal */
  computedBoundingClientRect: DOMRect = { x: 0, y: 0, width: 0, height: 0 };

  /** @internal */
  root: DOMDocument | null;

  constructor() {
    super();
    this.root = null;
    this.id = nodeId++;
  }

  insertBefore(child: DOMNode, ref?: DOMNode | null | undefined): void {
    super.insertBefore(child, ref);
    child.setRootDocument(this.root);
    this.emitRoot('DOMChanged');
  }

  remove(): void {
    super.remove();
    this.setRootDocument(null);
  }

  setRootDocument(document: DOMDocument | null) {
    this.root = document;
    for (const child of this.childNodes) {
      child.setRootDocument(document);
    }
  }

  getBoundingClientRect(): DOMRect {
    return { ...this.computedBoundingClientRect };
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
