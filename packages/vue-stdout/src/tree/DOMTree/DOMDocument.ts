import { treeToText } from '../utils/treeToText';
import { DOMComment } from './DOMComment';
import { DOMElement } from './DOMElement';
import { DOMNode, DOMNodeType } from './DOMNode';
import { DOMText } from './DOMText';

export class DOMDocument extends DOMNode {
  readonly nodeType: DOMNodeType.DOCUMENT = DOMNodeType.DOCUMENT;

  readonly nodeName: string = 'DOMDocument';

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
