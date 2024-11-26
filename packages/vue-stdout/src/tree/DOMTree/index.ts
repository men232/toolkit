import { DOMComment } from './DOMComment';
import { DOMDocument } from './DOMDocument';
import { DOMElement } from './DOMElement';
import { DOMNode, DOMNodeType } from './DOMNode';
import { DOMText } from './DOMText';

export { DOMComment } from './DOMComment';
export { DOMDocument } from './DOMDocument';
export { DOMElement } from './DOMElement';
export { DOMNode, DOMNodeType } from './DOMNode';
export { DOMText } from './DOMText';

export const DOM = Object.freeze({
  Document: DOMDocument,
  Text: DOMText,
  Comment: DOMComment,
  Element: DOMElement,
  Node: DOMNode,
  Type: DOMNodeType,

  createDocument: DOMDocument.createDocument.bind(DOMDocument),
  createComment: DOMDocument.createComment.bind(DOMDocument),
  createTextNode: DOMDocument.createTextNode.bind(DOMDocument),
  createElement: DOMDocument.createElement.bind(DOMDocument),
} as const);
