import { withCache } from '@andrew_l/toolkit';
import chalk from 'chalk';
import widestLine from 'widest-line';
import type { DOMElement } from '../DOMTree/DOMElement';
import type Layer from './Layer';
import { RenderNode, RenderNodeType } from './RenderNode';
import { colorize } from './utils/colorize';
import { wrapText } from './utils/wrapText';

export class RenderText extends RenderNode {
  readonly nodeType: RenderNodeType = RenderNodeType.TEXT;

  readonly nodeName: string = 'RenderText';

  constructor() {
    super();
    this.yogaNode.setMeasureFunc(this.measure.bind(this));
  }

  getDisplayName(): string {
    return super.getDisplayName() + '/' + this.getTextWrapStyle();
  }

  /**
   * Measure the dimensions of the text associated
   * callback for css-layout
   * @param: width - input width extents
   * @param: widthMeasureMode - mode to constrain width CSS_MEASURE_MODE_EXACTLY, CSS_MEASURE_MODE_UNDEFINED
   * @param: height - input height extents
   * @param: heightMeasureMode - mode to constrain height CSS_MEASURE_MODE_EXACTLY, CSS_MEASURE_MODE_UNDEFINED
   * @return: object containing measured width and height
   */
  measure(
    width: number,
    widthMeasureMode: number,
    height: number,
    heightMeasureMode: number,
  ): { width: number; height: number } {
    const text = this.domNode?.textContent;

    if (!text) return { width: 0, height: 0 };

    const dimensions = RenderText.measureText(text);

    // Text fits into container, no need to wrap
    if (dimensions.width <= width) {
      return dimensions;
    }

    // This is happening when <Box> is shrinking child nodes and Yoga asks
    // if we can fit this text node in a <1px space, so we just tell Yoga "no"
    if (dimensions.width >= 1 && width > 0 && width < 1) {
      return dimensions;
    }

    const wrappedText = wrapText(text, width, this.getTextWrapStyle());

    return RenderText.measureText(wrappedText);
  }

  getTextWrapStyle() {
    return (
      (this.domNode?.parentNode as DOMElement)?.attributes?.textWrap ?? 'wrap'
    );
  }

  static measureText = withCache(
    (text: string): { width: number; height: number } => {
      if (text.length === 0) {
        return {
          width: 0,
          height: 0,
        };
      }

      const width = widestLine(text);
      const height = text.split('\n').length;

      return { width, height };
    },
  );

  renderToLayer(layer: Layer): void {
    const { domNode } = this;
    const { width: maxWidth } = this.getContentRect();
    const x = this.realX;
    const y = this.realY;

    if (!domNode) return;

    let text = domNode.textContent;

    if (text && text.length > 0) {
      const currentWidth = widestLine(text);

      if (currentWidth > maxWidth) {
        text = wrapText(text, maxWidth, this.getTextWrapStyle());
      }

      layer.write(x, y, text, {
        transformers: this.transformers,
      });
    }
  }

  computeStyles(): void {
    this.transformers = [];

    const attributes =
      (this.domNode?.parentNode as DOMElement).attributes ?? {};

    if (attributes.dimColor) {
      this.transformers.push(v => chalk.dim(v));
    }

    if (attributes.color) {
      this.transformers.push(v => colorize(v, attributes.color, 'foreground'));
    }

    if (attributes.backgroundColor) {
      this.transformers.push(v =>
        colorize(v, attributes.backgroundColor, 'background'),
      );
    }

    if (attributes.bold) {
      this.transformers.push(v => chalk.bold(v));
    }

    if (attributes.italic) {
      this.transformers.push(v => chalk.italic(v));
    }

    if (attributes.underline) {
      this.transformers.push(v => chalk.underline(v));
    }

    if (attributes.strikethrough) {
      this.transformers.push(v => chalk.strikethrough(v));
    }

    if (attributes.inverse) {
      this.transformers.push(v => chalk.inverse(v));
    }
  }
}
