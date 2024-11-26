import chalk from 'chalk';
import cliBoxes from 'cli-boxes';
import Yoga from 'yoga-wasm-web/auto';
import type { DOMElement } from '../DOMTree/DOMElement';
import type Layer from './Layer';
import { RenderNode, RenderNodeType } from './RenderNode';
import { colorize } from './utils/colorize';

export class RenderBlock extends RenderNode {
  readonly nodeType: RenderNodeType = RenderNodeType.BLOCK;

  readonly nodeName: string = 'RenderBlock';

  constructor() {
    super();
  }

  renderToLayer(layer: Layer): void {
    const { yogaNode, domNode } = this;
    const props = (domNode as DOMElement)?.attributes ?? {};
    const { width, height } = this.getComputedRect();
    const x = this.realX;
    const y = this.realY;

    let clipped = false;

    if (props.borderStyle) {
      const box =
        typeof props.borderStyle === 'string'
          ? (cliBoxes as any)[props.borderStyle]
          : props.borderStyle;

      const topBorderColor = props.borderTopColor ?? props.borderColor;
      const bottomBorderColor = props.borderBottomColor ?? props.borderColor;
      const leftBorderColor = props.borderLeftColor ?? props.borderColor;
      const rightBorderColor = props.borderRightColor ?? props.borderColor;

      const dimTopBorderColor = props.borderTopDimColor ?? props.borderDimColor;

      const dimBottomBorderColor =
        props.borderBottomDimColor ?? props.borderDimColor;

      const dimLeftBorderColor =
        props.borderLeftDimColor ?? props.borderDimColor;

      const dimRightBorderColor =
        props.borderRightDimColor ?? props.borderDimColor;

      const showTopBorder = props.borderTop !== false;
      const showBottomBorder = props.borderBottom !== false;
      const showLeftBorder = props.borderLeft !== false;
      const showRightBorder = props.borderRight !== false;

      const contentWidth =
        width - (showLeftBorder ? 1 : 0) - (showRightBorder ? 1 : 0);

      let topBorder = showTopBorder
        ? colorize(
            (showLeftBorder ? box.topLeft : '') +
              box.top.repeat(contentWidth) +
              (showRightBorder ? box.topRight : ''),
            topBorderColor,
            'foreground',
          )
        : undefined;

      if (showTopBorder && dimTopBorderColor) {
        topBorder = chalk.dim(topBorder);
      }

      let verticalBorderHeight = height;

      if (showTopBorder) {
        verticalBorderHeight -= 1;
      }

      if (showBottomBorder) {
        verticalBorderHeight -= 1;
      }

      let leftBorder = (
        colorize(box.left, leftBorderColor, 'foreground') + '\n'
      ).repeat(verticalBorderHeight);

      if (dimLeftBorderColor) {
        leftBorder = chalk.dim(leftBorder);
      }

      let rightBorder = (
        colorize(box.right, rightBorderColor, 'foreground') + '\n'
      ).repeat(verticalBorderHeight);

      if (dimRightBorderColor) {
        rightBorder = chalk.dim(rightBorder);
      }

      let bottomBorder = showBottomBorder
        ? colorize(
            (showLeftBorder ? box.bottomLeft : '') +
              box.bottom.repeat(contentWidth) +
              (showRightBorder ? box.bottomRight : ''),
            bottomBorderColor,
            'foreground',
          )
        : undefined;

      if (showBottomBorder && dimBottomBorderColor) {
        bottomBorder = chalk.dim(bottomBorder);
      }

      const offsetY = showTopBorder ? 1 : 0;

      if (topBorder) {
        layer.write(x, y, topBorder, { transformers: [] });
      }

      if (showLeftBorder) {
        layer.write(x, y + offsetY, leftBorder, { transformers: [] });
      }

      if (showRightBorder) {
        layer.write(x + width - 1, y + offsetY, rightBorder, {
          transformers: [],
        });
      }

      if (bottomBorder) {
        layer.write(x, y + height - 1, bottomBorder, { transformers: [] });
      }
    }

    const clipHorizontally =
      props.overflowX === 'hidden' || props.overflow === 'hidden';

    const clipVertically =
      props.overflowY === 'hidden' || props.overflow === 'hidden';

    if (clipHorizontally || clipVertically) {
      const x1 = clipHorizontally
        ? x + yogaNode.getComputedBorder(Yoga.EDGE_LEFT)
        : undefined;

      const x2 = clipHorizontally
        ? x +
          yogaNode.getComputedWidth() -
          yogaNode.getComputedBorder(Yoga.EDGE_RIGHT)
        : undefined;

      const y1 = clipVertically
        ? y + yogaNode.getComputedBorder(Yoga.EDGE_TOP)
        : undefined;

      const y2 = clipVertically
        ? y +
          yogaNode.getComputedHeight() -
          yogaNode.getComputedBorder(Yoga.EDGE_BOTTOM)
        : undefined;

      layer.clip({ x1, x2, y1, y2 });
      clipped = true;
    }
  }
}
