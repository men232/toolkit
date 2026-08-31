import { h, type FunctionalComponent, type VNodeChild } from 'vue';
import type { Styles } from '../tree/utils/applyStyles';
import { castBooleanProps } from './booleanProps';
import { camelizeProps } from './kebabProps';

export interface BoxProps extends Styles {
  children?: VNodeChild;
}

export const Box: FunctionalComponent<BoxProps> = (props, { slots }) => {
  // Both normalisations rather than a runtime `props` declaration: declaring
  // props here would route every undeclared style into `attrs` and delete it
  // from this spread, and would turn an absent `borderTop` into an explicit
  // `false`. The argument in full is in `booleanProps.ts` and `kebabProps.ts`.
  //
  // `camelizeProps` first: `<Box border-top>` arrives with both the wrong key
  // and the empty string, and the cast only recognises `borderTop`.
  //
  // `h()` rather than JSX, and that is the whole point of the line.
  // `<stdout-box {...attrs}>{slots.default?.()}</stdout-box>` compiles to
  // `createVNode('stdout-box', attrs, [slots.default?.()])` -- the slot's
  // children *nested inside* a one-element array. A nested array is not a
  // vnode, so `normalizeVNode` turns it into a Fragment, and a Fragment mounts
  // with an anchor on each side: two extra host `DOMText` nodes per `<Box>`,
  // for a tree with about twice as many nodes as it has elements, none of
  // which paint anything. Passing the array straight through is the same
  // children with none of that. See `test/component-host-tree.test.tsx`, which
  // is the only thing that can catch it -- the frame is identical either way.
  return h('stdout-box', castBooleanProps(camelizeProps(props)), slots.default?.());
};

Box.displayName = 'Box';
