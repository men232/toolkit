import { treeToText } from '../utils/treeToText';
import { Yoga, type YogaNode } from '../yoga';
import { DOMComment } from './DOMComment';
import { DOMElement } from './DOMElement';
import { DOMNode, DOMNodeType } from './DOMNode';
import { DOMText } from './DOMText';

export class DOMDocument extends DOMNode {
  readonly nodeType: DOMNodeType.DOCUMENT = DOMNodeType.DOCUMENT;

  readonly nodeName: string = 'DOMDocument';

  /**
   * The document is the layout root, so it owns a Yoga node too — otherwise
   * top-level elements would have nothing to attach to.
   *
   * @internal
   */
  declare yogaNode: YogaNode;

  constructor() {
    super();

    this.yogaNode = Yoga.Node.create();

    // Note the document does NOT take `resetYogaStyles()`. That function
    // describes an *element* — a Box, which is `row` + `wrap`. The layout root
    // is a stack of top-level blocks: COLUMN + NO_WRAP, which is exactly what
    // Yoga defaults to, and what ink's own root node uses (it never applies
    // styles to `ink-root` either). Left bare on purpose.
  }

  static createDocument(): DOMDocument {
    return new DOMDocument();
  }

  static createTextNode(data?: string) {
    return new DOMText(data);
  }

  static createComment(data?: string): DOMComment {
    return new DOMComment(data);
  }

  static createElement(tagName: string): DOMElement {
    return new DOMElement(tagName);
  }

  insertBefore(child: DOMNode, ref?: DOMNode | null | undefined): void {
    super.insertBefore(child, ref);
    child.setRootDocument(this);
  }

  get treeText() {
    return treeToText(this);
  }
}
