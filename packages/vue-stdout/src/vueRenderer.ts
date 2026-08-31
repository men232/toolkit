import { createRenderer } from '@vue/runtime-core';

import * as nodeOps from './nodeOps';
import type { DOMDocument, DOMElement, DOMNode } from './tree/DOMTree';

/**
 * The renderer seam: Vue's own runtime, instantiated against this package's
 * host operations (`src/nodeOps.ts`) instead of the DOM's.
 *
 * `createVueApp` is Vue's real `createApp` -- the same factory
 * `vue`'s browser entry hands out, only bound to a different host. Everything
 * on the object it returns (`use`, `component`, `directive`, `provide`,
 * `mixin`, `config`, `unmount`, `runWithContext`) is Vue's, unmodified. The
 * public `createApp` in `src/createApp.ts` wraps only `mount`, whose argument
 * is a terminal rather than a DOM element.
 *
 * Named apart from the public entry point on purpose: two functions called
 * `createApp` in one `src/` is a reading hazard, and this one is not the one
 * consumers get.
 */
export const { createApp: createVueApp } = createRenderer<
  DOMNode,
  DOMElement | DOMDocument
>(nodeOps);
