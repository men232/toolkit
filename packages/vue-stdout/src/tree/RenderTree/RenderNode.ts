import Yoga, { type Node as YogaNode } from 'yoga-wasm-web/auto';
import type { DOMElement } from '../DOMTree/DOMElement';
import type { DOMNode } from '../DOMTree/DOMNode';
import { NodeTree } from '../NodeTree';
import type Layer from './Layer';
import type { OutputTransformer } from './Layer';
import { applyStyles } from './utils/applyStyles';

export enum RenderNodeType {
  NODE = 1,
  BLOCK = 2,
  INLINE = 3,
  TEXT = 4,
}

let nodeId: number = 0;

export interface RenderNodeRect {
  height: number;
  width: number;
  x: number;
  y: number;
}

export class RenderNode extends NodeTree<RenderNode> {
  readonly id: number;

  readonly nodeType: RenderNodeType = RenderNodeType.NODE;

  readonly nodeName: string = 'RenderNode';

  transformers: OutputTransformer[] = [];

  /** @internal */
  domNode: DOMNode | null;

  /** @internal */
  yogaNode: YogaNode;

  realX: number;
  realY: number;

  constructor() {
    super();
    this.id = nodeId++;
    this.yogaNode = Yoga.Node.create();
    this.domNode = null;
    this.realX = 0;
    this.realY = 0;
  }

  getDisplayName(): string {
    const { x, y, width, height } = this.getComputedRect();
    const rectText = `x=${this.realX},y=${y}/${this.realY}, w=${width},h=${height},t=${this.transformers.length}`;

    return (
      `${this.nodeName}` +
      (this.domNode ? `(${this.domNode.getDisplayName()})` : '') +
      ' ' +
      rectText
    );
  }

  getDisplayData(): Record<string, any> {
    return {
      id: this.id,
      nodeType: RenderNodeType[this.nodeType],
      ...super.getDisplayData(),
    };
  }

  remove(): void {
    super.remove();
    this.parentNode?.yogaNode.removeChild(this.yogaNode);
  }

  destroy(): void {
    super.destroy();
    this.yogaNode.free();
  }

  insertBefore(child: RenderNode, ref?: RenderNode | null | undefined): void {
    super.insertBefore(child, ref);

    const parent = this;

    if (!ref) {
      parent.yogaNode.insertChild(
        child.yogaNode,
        parent.yogaNode.getChildCount(),
      );
    } else {
      const refIndex = parent.childNodes.indexOf(child);
      parent.yogaNode.insertChild(child.yogaNode, refIndex);
    }
  }

  getComputedRect(): RenderNodeRect {
    const { yogaNode } = this;
    return {
      x: yogaNode.getComputedLeft(),
      y: yogaNode.getComputedTop(),
      width: yogaNode.getComputedWidth(),
      height: yogaNode.getComputedHeight(),
    };
  }

  getContentRect(): RenderNodeRect {
    const { yogaNode } = this;
    const rect = this.getComputedRect();
    const borderLeft = yogaNode.getComputedBorder(Yoga.EDGE_LEFT);
    const borderRight = yogaNode.getComputedBorder(Yoga.EDGE_RIGHT);
    const borderTop = yogaNode.getComputedBorder(Yoga.EDGE_TOP);
    const borderBottom = yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM);

    const paddingLeft = yogaNode.getComputedPadding(Yoga.EDGE_LEFT);
    const paddingRight = yogaNode.getComputedPadding(Yoga.EDGE_RIGHT);
    const paddingTop = yogaNode.getComputedPadding(Yoga.EDGE_TOP);
    const paddingBottom = yogaNode.getComputedPadding(Yoga.EDGE_BOTTOM);

    return {
      x: rect.x + borderLeft + paddingLeft,
      y: rect.y + borderTop + paddingTop,
      width: rect.width - borderLeft - borderRight - paddingLeft - paddingRight,
      height:
        rect.height - borderTop - borderBottom - paddingBottom - paddingTop,
    };
  }

  renderToLayer(layer: Layer) {}

  computeStyles() {
    this.transformers = [];

    if (this.domNode) {
      const attributes = (this.domNode as DOMElement).attributes ?? {};
      applyStyles(this.yogaNode, attributes);
    }
  }
}
