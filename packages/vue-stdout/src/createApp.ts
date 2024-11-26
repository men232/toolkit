import { createRenderer } from '@vue/runtime-core';

import * as nodeOps from './nodeOps';
import type { DOMDocument, DOMElement, DOMNode } from './tree/DOMTree';

export const { createApp } = createRenderer<DOMNode, DOMElement | DOMDocument>(
  nodeOps,
);
