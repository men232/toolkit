import { DOMNode, DOMNodeType } from './DOMNode';

export class DOMText extends DOMNode {
  readonly nodeType = DOMNodeType.TEXT_NODE;

  readonly nodeName: string = 'DOMText';

  /** @internal */
  textValue: string | null;

  constructor(data: string | null = '') {
    super();
    this.textValue = data;
  }

  get textContent(): string | null {
    return this.textValue;
  }

  set textContent(value: string | null) {
    this.textValue = value;
  }

  getDisplayData(): any {
    return {
      ...super.getDisplayData(),
      textContent: this.textContent,
    };
  }

  getDisplayName(): string {
    return `${this.nodeName}(${this.textValue?.length})`;
  }
}
