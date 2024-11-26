import { EventEmitter } from 'node:events';

/**
 * Basic node tree implementation
 */
export class NodeTree<T extends NodeTree<T>> extends EventEmitter {
  readonly nodeName: string = 'NodeTree';

  parentNode: T | null = null;

  childNodes: T[] = [];

  getDisplayName(): string {
    return this.nodeName;
  }

  getDisplayData(): Record<string, any> {
    return {};
  }

  toJSON(): any {
    return {
      ...this.getDisplayData(),
      childNodes: this.childNodes.map(v => v.toJSON()),
    };
  }

  get lastChild(): T | null {
    return this.childNodes.at(-1) ?? null;
  }

  get firstChild(): T | null {
    return this.childNodes.at(0) ?? null;
  }

  get nextSibling(): T | null {
    const parent = this.parentNode;
    if (!parent) {
      return null;
    }
    const i = parent.childNodes.indexOf(this as any as T);
    return parent.childNodes[i + 1] || null;
  }

  get previousSibling(): T | null {
    const parent = this.parentNode;
    if (!parent) {
      return null;
    }
    const i = parent.childNodes.indexOf(this as any as T);
    return parent.childNodes[i - 1] || null;
  }

  appendChild(node: T): void {
    this.insertBefore(node);
  }

  removeChild(node: T): void {
    const i = this.childNodes.indexOf(node);

    if (i > -1) {
      node.remove();
    }
  }

  insertBefore(child: T, ref?: T | null) {
    const parent = this;
    let refIndex;

    if (ref) {
      refIndex = this.childNodes.indexOf(ref);
      if (refIndex === -1) {
        throw new Error('ref is not a child of parent');
      }
    }

    child.remove();
    child.parentNode = parent as any as T;

    // re-calculate the ref index because the child's removal may have affected it
    refIndex = ref ? parent.childNodes.indexOf(ref) : -1;
    if (refIndex === -1) {
      parent.childNodes.push(child);
    } else {
      parent.childNodes.splice(refIndex, 0, child);
    }
  }

  remove() {
    const parent = this.parentNode;

    if (!parent) return;

    const i = parent.childNodes.indexOf(this as any as T);

    if (i > -1) {
      parent.childNodes.splice(i, 1);
    } else {
      throw Error('target is not a childNode of parent');
    }

    this.parentNode = null;
  }

  /** @internal */
  destroy() {
    this.remove();

    this.childNodes.forEach(c => c.destroy());
    this.childNodes = [];
  }
}
