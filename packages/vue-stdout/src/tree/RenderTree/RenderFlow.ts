import Yoga from 'yoga-wasm-web/auto';
import type { DOMDocument } from '../DOMTree/DOMDocument';
import type { DOMElement } from '../DOMTree/DOMElement';
import { type DOMNode, DOMNodeType } from '../DOMTree/DOMNode';
import type { DOMText } from '../DOMTree/DOMText';
import { treeToText } from '../utils/treeToText';
import Layer from './Layer';
import { RenderBlock } from './RenderBlock';
import { RenderInline } from './RenderInline';
import { RenderNode, RenderNodeType } from './RenderNode';
import { RenderText } from './RenderText';

const INLINE_ELEMENT_TAGS = new Set(['span', 'b', 'a']);

export interface RenderFlowOptions {
  document: DOMDocument;
  width: number;
  height: number;
}

export class RenderFlow extends RenderNode {
  /** @internal */
  document: DOMDocument;

  readonly nodeType: RenderNodeType = RenderNodeType.NODE;

  readonly nodeName: string = 'RenderFlow';

  height: number;

  width: number;

  layer: Layer;

  reflowScheduled: boolean = false;

  constructor({ document, width, height }: RenderFlowOptions) {
    super();
    this.document = document;
    this.width = width;
    this.height = height;
    this.layer = new Layer({ width, height });
    document.on('DOMChanged', this.onDOMChanged.bind(this));
  }

  get treeText() {
    return treeToText(this);
  }

  /** @internal */
  onDOMChanged() {
    this.reflowSchedule();
  }

  render() {
    this.realX = 0;
    this.realY = 0;

    this.layer.width = this.width;
    this.layer.height = this.yogaNode.getComputedHeight();

    this.renderNode(this);
    this.layer.compute();

    return this.layer.frame;
  }

  /** @internal */
  renderNode(node: RenderNode) {
    for (const childNode of node.childNodes) {
      const { domNode } = childNode;
      const { x, y } = childNode.getComputedRect();

      if (domNode) {
        const clientRect = childNode.getContentRect();

        if (
          domNode.computedBoundingClientRect.width !== clientRect.width ||
          domNode.computedBoundingClientRect.height !== this.height
        ) {
          domNode.computedBoundingClientRect = clientRect;
          domNode.emit('resize');
        }
      }

      childNode.realX = x + node.realX;
      childNode.realY = y + node.realY;
      childNode.renderToLayer(this.layer);
      this.renderNode(childNode);
    }
  }

  reflow() {
    for (const childNode of this.childNodes) {
      childNode.destroy();
    }

    this.childNodes = [];

    for (const domNode of this.document.childNodes) {
      this.reflowNode(domNode, this);
    }

    this.yogaNode.setWidth(this.width);
    this.yogaNode.calculateLayout(undefined, undefined, Yoga.DIRECTION_LTR);
  }

  reflowSchedule() {
    if (this.reflowScheduled) return;

    this.reflowScheduled = true;

    process.nextTick(() => {
      this.reflow();
      const output = this.render();
      this.reflowScheduled = false;

      this.emit('frame', output);
    });
  }

  /** @internal */
  reflowNode(domNode: DOMNode, renderNode: RenderNode) {
    switch (domNode.nodeType) {
      case DOMNodeType.COMMENT_NODE: {
        break;
      }

      case DOMNodeType.ELEMENT_NODE: {
        if (INLINE_ELEMENT_TAGS.has((domNode as DOMElement).tagName)) {
          this.reflowAsInline(domNode, renderNode);
          break;
        }

        this.reflowAsBlock(domNode, renderNode);
        break;
      }

      case DOMNodeType.DOCUMENT: {
        this.reflowAsBlock(domNode, renderNode);
        break;
      }

      case DOMNodeType.TEXT_NODE: {
        this.reflowAsInline(domNode, renderNode);
        break;
      }
    }
  }

  /** @internal */
  reflowAsBlock(domNode: DOMNode, renderNode: RenderNode) {
    const block = new RenderBlock();
    block.domNode = domNode;
    block.computeStyles();

    renderNode.insertBefore(block);

    for (const childDom of domNode.childNodes) {
      this.reflowNode(childDom, block);
    }
  }

  /** @internal */
  reflowAsInline(domNode: DOMNode, renderNode: RenderNode) {
    let newRenderNode = renderNode;
    let nodeReplaced = false;

    if (renderNode.nodeType !== RenderNodeType.INLINE) {
      const lastChild = renderNode.lastChild;

      if (lastChild?.nodeType === RenderNodeType.INLINE) {
        newRenderNode = lastChild;
      } else {
        newRenderNode = new RenderInline();
        nodeReplaced = true;
      }
    }

    if (domNode.nodeType === DOMNodeType.TEXT_NODE) {
      if (!(domNode as DOMText).textContent) return;

      const text = new RenderText();
      text.domNode = domNode;
      text.computeStyles();

      if (nodeReplaced) {
        renderNode.insertBefore(newRenderNode);
      }

      newRenderNode.insertBefore(text);
      return;
    }

    for (const childDom of domNode.childNodes) {
      this.reflowNode(childDom, newRenderNode);
    }

    if (nodeReplaced && newRenderNode.childNodes.length) {
      renderNode.insertBefore(newRenderNode);
    }
  }
}
