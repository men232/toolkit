import type { DOMElement } from './DOMTree/DOMElement';
import { DOMNodeType } from './DOMTree/DOMNode';
import { isInlineElement } from './tags';
import { sanitizeAnsi } from './utils/sanitizeAnsi';
import { textTransformers } from './utils/textTransformers';

/**
 * Collapse an inline element's whole subtree into one styled string.
 *
 * Ported from ink's `squash-text-nodes.ts`. It is the model the rest of the
 * text pipeline is built on, not an optimisation:
 *
 * - **Nesting works.** Each nested element applies its own transform *here*, as
 *   its text is joined in, so an outer element's styling layers on top of it
 *   afterwards (`Layer.write`). Reading styles off a text run's immediate
 *   parent alone silently drops every ancestor's.
 * - **Mixed content works.**
 *   `<stdout-text>a<stdout-text>b</stdout-text></stdout-text>` is one string,
 *   `"ab"`, measured by one Yoga node. Laying out child *boxes* instead leaves
 *   the bare `a`, which has no box, occupying no space at all.
 * - **Whole-string transforms become possible.** A user `Transform` needs the
 *   finished text, not three fragments.
 *
 * A non-inline child (a `<stdout-box>` inside a `<stdout-text>`) contributes
 * nothing, as in ink: it is not part of the text flow. The result is swept by
 * {@link sanitizeAnsi} at every level of the recursion, also as in ink —
 * unsanitised user text (a log line, an API response, a filename) can otherwise
 * carry a cursor-movement or screen-clearing escape straight to the terminal.
 *
 * ## Per-frame cache
 *
 * Every frame runs this three times over the same outer element: `applyMeasureFunc`
 * and `measuresOwnText` (`layout.ts`) to decide whether and how to measure, and
 * `paintText` (`render.ts`) to get the string it writes into the `Layer`. Layout
 * runs fully and synchronously before paint and nothing mutates the subtree in
 * between, so recomputing is pure waste. {@link beginSquashFrame} marks the
 * boundary, called once at the top of `computeLayout` — the one call every render
 * path makes before painting anything, including a `<Static>` child painted
 * separately by `renderStaticElement`, which relies on that earlier
 * `computeLayout` having primed its entry in the same frame. A generation counter
 * rather than a cleared `Map`, because `WeakMap` (needed so a destroyed element's
 * entry is reclaimed with it) has no bulk-clear.
 *
 * **Not a safe fallback when there is no active frame at all.**
 * `squashGeneration` is never reset, so two bare calls that skip
 * `beginSquashFrame()` — a direct unit-test call, say — share one ambient
 * generation and the second returns the first's cached string, stale if the
 * subtree changed. No production path does that, so it is a hazard for a future
 * direct caller rather than a live bug.
 */
let squashGeneration = 0;

/**
 * Mark the start of a new frame for {@link squashTextNodes}'s cache — see its
 * own doc comment. Call once, before any layout or paint work begins.
 */
export function beginSquashFrame(): void {
  squashGeneration++;
}

interface SquashCacheEntry {
  generation: number;
  text: string;
}

const squashCache = new WeakMap<DOMElement, SquashCacheEntry>();

export function squashTextNodes(node: DOMElement): string {
  const cached = squashCache.get(node);
  if (cached && cached.generation === squashGeneration) return cached.text;

  let text = '';

  for (let index = 0; index < node.childNodes.length; index++) {
    const childNode = node.childNodes[index];

    if (!childNode) continue;

    if (childNode.nodeType === DOMNodeType.TEXT_NODE) {
      text += childNode.textContent ?? '';
      continue;
    }

    if (!isInlineElement(childNode)) continue;

    let nodeText = squashTextNodes(childNode);

    // Guarded on non-empty: an empty string would come back wrapped in this
    // element's escape codes, and `Layer` would emit a styled cell for text
    // that does not exist.
    if (nodeText.length > 0) {
      for (const transform of textTransformers(childNode)) {
        nodeText = transform(nodeText, index);
      }
    }

    text += nodeText;
  }

  // Swept again after concatenation, not just per child: a transform may have
  // reintroduced something dangerous.
  const result = sanitizeAnsi(text);

  squashCache.set(node, { generation: squashGeneration, text: result });

  return result;
}
