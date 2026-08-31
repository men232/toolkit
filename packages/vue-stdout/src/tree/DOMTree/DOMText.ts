import { DOMNode, DOMNodeType } from './DOMNode';

/**
 * A run of text.
 *
 * It deliberately owns **no** Yoga node (`yogaNode` stays `null`, inherited
 * from `DOMNode`). Text is sized by the measure function of the inline element
 * that contains it — see `computeLayout` in `../layout` — because a text run
 * has no box of its own to lay out: giving it one would add a competing item
 * to the parent's flex line and double-count its width.
 */
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
