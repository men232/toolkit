import { DOMNode, DOMNodeType } from './DOMNode';
import { DOMText } from './DOMText';

export class DOMElement extends DOMNode {
  readonly nodeType: DOMNodeType.ELEMENT_NODE = DOMNodeType.ELEMENT_NODE;

  readonly nodeName: string = 'DOMElement';

  readonly tagName: string;

  readonly attributes: Record<string, any> = {};

  constructor(tagName: string) {
    super();

    this.tagName = tagName;
  }

  getDisplayName(): string {
    return `${this.nodeName}(${this.tagName})`;
  }

  getDisplayData(): any {
    return {
      ...super.getDisplayData(),
      tagName: this.tagName,
      attributes: this.attributes,
    };
  }

  getAttribute(name: string): any {
    return this.attributes[name];
  }

  setAttribute(name: string, value: any) {
    this.attributes[name] = value;
    this.emitRoot('DOMChanged');
  }

  removeAttribute(name: string) {
    delete this.attributes[name];
  }

  set textContent(value: string) {
    this.childNodes.forEach(c => c.destroy());

    if (!value) return;

    const textNode = new DOMText(value);

    this.appendChild(textNode);
  }

  get textContent(): string {
    let text = '';

    for (let index = 0; index < this.childNodes.length; index++) {
      const childNode = this.childNodes[index];

      let nodeText = '';

      if (childNode.nodeType === DOMNodeType.COMMENT_NODE) continue;

      nodeText = childNode.textContent ?? '';
      text += nodeText;
    }

    return text;
  }
}
