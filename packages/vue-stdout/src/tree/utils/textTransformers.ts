import chalk from 'chalk';
import type { DOMElement } from '../DOMTree/DOMElement';
import { type DOMNode, DOMNodeType } from '../DOMTree/DOMNode';
import type { OutputTransformer } from '../Layer';
import { colorize } from './colorize';

/**
 * The styling an inline element applies to whatever text it contains, as an
 * ordered list of string transforms.
 *
 * Two callers, and the order between them is what produces ink's nesting:
 * `squashTextNodes` runs these for every *nested* element as it joins the
 * subtree into one string, while the outermost inline element hands its own
 * list to `Layer.write`, which applies them to the finished line. So an
 * `<stdout-text bold><stdout-text color="green">x</stdout-text></stdout-text>`
 * comes out `bold(green('x'))` — inner-first, exactly like ink.
 *
 * The order *within* the list mirrors ink's `Text` transform (dim, colour,
 * background, then the SGR attributes); `Layer` applies it left to right.
 *
 * `<Transform>` hooks into this same list via `internalTransform` rather than a
 * parallel path, so a user-supplied `(output, index) => string` runs on the
 * *finished* squashed string — this element's own (`paintText`) or a nested one
 * being folded into an ancestor's (`squashTextNodes`). It goes first, ahead of
 * styling on the same element, mirroring ink's
 * `[node.internal_transform, ...transformers]`.
 */
export function textTransformers(element: DOMElement): OutputTransformer[] {
  const attributes = element.attributes ?? {};
  const transformers: OutputTransformer[] = [];

  if (typeof attributes.internalTransform === 'function') {
    transformers.push(attributes.internalTransform);
  }

  if (attributes.dimColor) {
    transformers.push(v => chalk.dim(v));
  }

  if (attributes.color) {
    transformers.push(v => colorize(v, attributes.color, 'foreground'));
  }

  const backgroundColor = getInheritedBackgroundColor(element);

  if (backgroundColor) {
    transformers.push(v => colorize(v, backgroundColor, 'background'));
  }

  if (attributes.bold) {
    transformers.push(v => chalk.bold(v));
  }

  if (attributes.italic) {
    transformers.push(v => chalk.italic(v));
  }

  if (attributes.underline) {
    transformers.push(v => chalk.underline(v));
  }

  if (attributes.strikethrough) {
    transformers.push(v => chalk.strikethrough(v));
  }

  if (attributes.inverse) {
    transformers.push(v => chalk.inverse(v));
  }

  return transformers;
}

/**
 * The `backgroundColor` `element`'s own glyphs should carry: its own
 * `backgroundColor`, or — absent that — the nearest ancestor `<stdout-box>`'s,
 * walking past any `<stdout-box>` that has none of its own.
 *
 * Matches ink's `BackgroundContext`: a `<Box>` there only re-provides context
 * when it has a `backgroundColor` of its own, so one further up with none
 * passes the ambient value through unchanged — which skipping past a `<stdout-box>`
 * with no `backgroundColor` reproduces, one ancestor at a time.
 *
 * This is what lets painted characters carry the color of the fill
 * (`paintBackground`, `render.ts`) laid under them: `Layer.write` replaces a
 * cell outright rather than layering under it, so without this an unstyled
 * `<Text>` on a colored `<Box>` would punch a color-less hole in it wherever
 * its glyphs land.
 *
 * Distinct from a `<stdout-box>`'s own fill, which never inherits — only its own
 * `backgroundColor` decides whether `paintBackground` paints at all.
 *
 * @internal
 */
function getInheritedBackgroundColor(element: DOMElement): string | undefined {
  if (element.attributes?.backgroundColor) {
    return element.attributes.backgroundColor;
  }

  let node: DOMNode | null = element.parentNode;

  while (node) {
    if (node.nodeType === DOMNodeType.ELEMENT_NODE) {
      const ancestor = node as DOMElement;

      if (ancestor.tagName === 'stdout-box' && ancestor.attributes?.backgroundColor) {
        return ancestor.attributes.backgroundColor;
      }
    }

    node = node.parentNode;
  }

  return undefined;
}
