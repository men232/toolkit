import Yoga from 'yoga-wasm-web/auto';

import { RenderNode, RenderNodeType } from './RenderNode';

export class RenderInline extends RenderNode {
  readonly nodeType: RenderNodeType.INLINE = RenderNodeType.INLINE;

  readonly nodeName: string = 'RenderInline';

  constructor() {
    super();

    this.yogaNode.setDisplay(Yoga.DISPLAY_FLEX);
    this.yogaNode.setGap(Yoga.GUTTER_ALL, 0);
    this.yogaNode.setFlexDirection(Yoga.FLEX_DIRECTION_ROW);
    this.yogaNode.setFlexWrap(Yoga.WRAP_WRAP);
  }
}
