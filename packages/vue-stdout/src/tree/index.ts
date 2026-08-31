export * from './DOMTree';

// The engine's public surface, listed one name at a time on purpose. This
// barrel is re-exported from the package root, so `export *` here would make
// every future internal helper part of the published API by accident.
export { default as Layer } from './Layer';
export type { OutputTransformer } from './Layer';
export {
  computeLayout,
  getComputedRect,
  getContentRect,
  getTextWrapStyle,
  measuresOwnText,
} from './layout';
export type { LayoutRoot } from './layout';
export { renderToFrame, renderToLayer, Renderer } from './render';
export { squashTextNodes } from './squashText';
export type { RendererOptions } from './render';
export type { Styles } from './utils/applyStyles';
