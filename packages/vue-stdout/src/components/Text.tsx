import type { ForegroundColorName } from 'chalk';
import type { LiteralUnion } from 'type-fest';
import { type FunctionalComponent, type VNodeChild, h } from 'vue';
import type { Styles } from '../tree/utils/applyStyles';
import { castBooleanProps } from './booleanProps';
import { camelizeProps } from './kebabProps';

export interface TextProps {
  readonly children?: VNodeChild;

  /**
   * Change text color. Ink uses chalk under the hood, so all its functionality is supported.
   */
  readonly color?: LiteralUnion<ForegroundColorName, string>;

  /** Same as `color`, but for background. */
  readonly backgroundColor?: LiteralUnion<ForegroundColorName, string>;

  /** Dim the color (emit a small amount of light). */
  readonly dimColor?: boolean;

  /** Make the text bold. */
  readonly bold?: boolean;

  /** Make the text italic. */
  readonly italic?: boolean;

  /** Make the text underlined. */
  readonly underline?: boolean;

  /** Make the text crossed with a line. */
  readonly strikethrough?: boolean;

  /** Inverse background and foreground colors. */
  readonly inverse?: boolean;

  /**
   * This property tells Ink to wrap or truncate text if its width is larger than container.
   * If `wrap` is passed (by default), Ink will wrap text and split it into multiple lines.
   * If `truncate-*` is passed, Ink will truncate text instead, which will result in one line of text with the rest cut off.
   */
  readonly wrap?: Styles['textWrap'];
}

export const Text: FunctionalComponent<TextProps> = (props, { slots }) => {
  // `h()` rather than JSX, for the reason spelled out in `Box.tsx`:
  // `<stdout-text ...>{slots.default?.()}</stdout-text>` compiles to a nested
  // array, which Vue normalises into a Fragment and mounts with an anchor node
  // on either side — two extra host `DOMText` children per `<Text>`, invisible
  // in the frame and doubling the tree. `test/component-host-tree.test.tsx`
  // holds it.
  //
  // `wrap` is renamed to `textWrap` on the way out — the layout engine reads
  // `element.attributes.textWrap` (`getTextWrapStyle`, `src/tree/layout.ts`)
  // and never `.wrap`, so spreading `props` as-is would leave the prop inert.
  //
  // `castBooleanProps` turns a template's bare `<Text bold>` — which compiles
  // to `bold: ""`, falsy, and was silently dropped — into `bold: true`, and
  // `camelizeProps` turns a template's `dim-color` into the `dimColor` nothing
  // downstream would otherwise have read. See `booleanProps.ts` and
  // `kebabProps.ts` for why both live here rather than in a runtime `props`
  // declaration; the order matters, because `<Text dim-color>` is both defects
  // at once and the cast only recognises the camelCase name.
  const { wrap, ...rest } = castBooleanProps(camelizeProps(props));
  const attrs = { ...rest, textWrap: wrap };
  return h('stdout-text', attrs, slots.default?.());
};

Text.displayName = 'Text';
