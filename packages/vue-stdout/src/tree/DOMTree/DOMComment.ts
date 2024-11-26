import { DOMNode, DOMNodeType } from './DOMNode';

export class DOMComment extends DOMNode {
  readonly nodeType: DOMNodeType.COMMENT_NODE = DOMNodeType.COMMENT_NODE;

  readonly nodeName: string = 'DOMComment';

  /** @internal */
  textValue: string | null;

  constructor(data: string | null = null) {
    super();
    this.textValue = data;
  }

  get textContent(): string | null {
    return this.textValue;
  }

  set textContent(value: string | null) {
    this.textValue = value;
  }

  getDisplayData(): Record<string, any> {
    return {
      ...super.getDisplayData(),
      textContent: this.textContent,
    };
  }
}
