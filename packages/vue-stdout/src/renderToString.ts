import type { Component } from '@vue/runtime-core';
// Vue's own `createApp`, not this package's (`src/createApp.ts`): this
// function is a pure string renderer, not an app lifecycle. It mounts into a
// bare `DOMDocument` with no `Container`, no streams, no terminal and no exit
// promise, so the terminal-shaped `mount()` would be exactly wrong here.
import { createVueApp } from './vueRenderer';
import { DOMDocument } from './tree/DOMTree/DOMDocument';
import { collectStaticOutput, renderToFrame } from './tree/render';

export interface RenderToStringOptions {
  /**
   * Width of the virtual terminal in columns.
   *
   * @default 80
   */
  columns?: number;
}

/**
 * Render a component to a string synchronously.
 *
 * Does not write to stdout, does not attach terminal listeners and does not
 * start a persistent application. Useful for tests, docs and snapshots.
 */
export function renderToString(
  component: Component,
  options: RenderToStringOptions = {},
): string {
  const columns = options.columns ?? 80;

  const document = new DOMDocument();
  const app = createVueApp(component);

  app.mount(document);

  try {
    // Synchronous, and no `Renderer` is attached: nothing here subscribes to
    // `DOMChanged`, so `app.unmount()` below cannot queue a frame that would
    // run after the Yoga tree is freed.
    //
    // `<Static>` still works with no render loop to drive it: mounting is
    // synchronous, so its box already holds every item by the time
    // `app.mount()` returns, and `collectStaticOutput`'s per-document
    // `WeakMap` is fresh, so it all reads as new. Matches ink's own
    // `renderToString`, which prepends the same capture.
    //
    // Static output is collected *after* `renderToFrame` so the tree is laid
    // out only once: `renderToFrame`'s own `computeLayout` leaves every Yoga
    // rect where `collectStaticOutput` needs it, and painting perturbs none
    // of them (it only writes into the `Layer`, while the rect getters read
    // straight off the Yoga nodes).
    const dynamicOutput = renderToFrame(document, columns);
    const staticOutput = collectStaticOutput(document);

    return staticOutput ? `${staticOutput}\n${dynamicOutput}` : dynamicOutput;
  } finally {
    app.unmount();
    // Yoga nodes are WASM-backed and are not garbage collected.
    document.destroy();
  }
}
