import type { DOMElement } from './DOMTree/DOMElement';
import { type DOMNode, DOMNodeType } from './DOMTree/DOMNode';

/**
 * Elements that lay out their own text rather than their children's boxes.
 *
 * A set of one, and still a set rather than an equality check because it is
 * the pair to `INTRINSIC_TAGS` (`../sfc/compiler-options.ts`), whose superset
 * relation to this one `compiler-options.test.ts` asserts.
 *
 * It held `span`, `b` and `a` as well until the host tags were made private.
 * Nothing read the three-way split — `isInlineElement`, `isVirtualText` and
 * `squashTextNodes` all consult membership only — and no element was ever
 * created with `b` or `a`, so the three collapsed into the one prefixed tag.
 *
 * Kept here rather than in `./layout` so the DOM and the squasher can consult
 * it without importing the layout pass — `./layout` imports the squasher, so
 * the other direction would close a cycle. `./layout` re-exports it.
 */
export const INLINE_ELEMENT_TAGS: ReadonlySet<string> = new Set([
  'stdout-text',
]);

/** Whether `node` is an element whose content is an inline text flow. */
export function isInlineElement(node: DOMNode | null): node is DOMElement {
  return (
    !!node &&
    node.nodeType === DOMNodeType.ELEMENT_NODE &&
    INLINE_ELEMENT_TAGS.has((node as DOMElement).tagName)
  );
}

/**
 * Whether `element` is an inline element nested inside another one — ink's
 * `ink-virtual-text`.
 *
 * A virtual text element owns **no** Yoga node: the outermost inline ancestor
 * collapses the subtree into one string (`squashTextNodes`) and measures that,
 * so a nested element with a box of its own would put a second, competing item
 * into the flex line and double-count its width.
 *
 * Deliberately local — this element and its parent, nothing further up. That is
 * what makes it correct to re-evaluate on a single `insertBefore` without
 * walking the subtree: a descendant's answer depends on *its* parent, which the
 * move does not change.
 */
export function isVirtualText(element: DOMElement): boolean {
  return isInlineElement(element) && isInlineElement(element.parentNode);
}

/**
 * Whether `node` is a `<Static>` root — ink's `internal_static` box.
 *
 * Not a `Styles` property but structural metadata: the paint pass (`render.ts`)
 * reads it to skip the element in the ordinary frame and paint it separately,
 * once, straight to the terminal (`Container`).
 */
export function isStaticElement(node: DOMNode | null): node is DOMElement {
  return (
    !!node &&
    node.nodeType === DOMNodeType.ELEMENT_NODE &&
    !!(node as DOMElement).attributes?.internalStatic
  );
}
