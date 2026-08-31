import { describe, expect, it } from 'vitest';
import {
  insert,
  patchProp,
  remove,
  setElementText,
  setScopeId,
  setText,
} from '../src/nodeOps';
import { DOM, type DOMElement, type DOMText } from '../src/tree/DOMTree';
import { renderToFrame } from '../src/tree/render';

/**
 * Styles are pushed into Yoga only for elements flagged `yogaStylesDirty`
 * (`src/tree/DOMTree/DOMElement.ts`), instead of being reset and reapplied for
 * every element on every frame. That turns a whole class of render bug into a
 * possibility: a mutation that never reaches the flag leaves the tree laid out
 * against the styles it had before.
 *
 * So this file is not "does the flag cache" — it is one case per **mutation
 * path in `src/nodeOps.ts`**, the complete list of ways Vue can change this
 * tree, each mutating an already-framed tree and asserting the *next* frame
 * moved. The three that reach the flag (`setAttribute`, `removeAttribute`,
 * `updateYogaOwnership`) were each seen red with their
 * `yogaStylesDirty = true` removed; the rest hold the structural paths, which
 * reach Yoga by other means and must keep doing so.
 *
 * The tree is driven through `nodeOps` and `renderToFrame` rather than through
 * a mounted app so that a frame is a synchronous, deterministic function call.
 */
describe('style invalidation across mutation paths', () => {
  const box = () => DOM.Document.createElement('stdout-box');
  const text = () => DOM.Document.createElement('stdout-text');

  /** A document holding one `<Box>` with one `<Text>` child, already framed. */
  const mount = () => {
    const document = DOM.Document.createDocument();
    const root = box();
    const label = text();
    const runs = DOM.Document.createTextNode('ab') as DOMText;

    insert(label, root);
    insert(runs, label);
    insert(root, document as unknown as DOMElement);

    return { document, root, label, runs };
  };

  const frame = (document: ReturnType<typeof mount>['document']) =>
    renderToFrame(document, 20);

  it('applies an attribute set through patchProp', () => {
    const { document, root } = mount();
    expect(frame(document)).toBe('ab');

    patchProp(root, 'paddingLeft', undefined, 3);
    expect(frame(document)).toBe('   ab');
  });

  it('applies an attribute removal through patchProp', () => {
    const { document, root } = mount();
    patchProp(root, 'paddingLeft', undefined, 3);
    expect(frame(document)).toBe('   ab');

    // Vue signals "this prop is gone" with `undefined`, which `patchProp`
    // turns into `removeAttribute`. The reset half of the pair is the only
    // thing that clears a withdrawn style, so this is the case that breaks if
    // removal does not reach the flag.
    patchProp(root, 'paddingLeft', 3, undefined);
    expect(frame(document)).toBe('ab');
  });

  it('lays out a child inserted after the first frame', () => {
    const { document, root } = mount();
    expect(frame(document)).toBe('ab');

    const second = text();
    insert(DOM.Document.createTextNode('cd'), second);
    patchProp(second, 'paddingLeft', undefined, 1);
    insert(second, root);

    expect(frame(document)).toBe('ab cd');
  });

  it('reflows after a child is removed', () => {
    const { document, root } = mount();
    const second = text();
    insert(DOM.Document.createTextNode('cd'), second);
    insert(second, root);
    expect(frame(document)).toBe('abcd');

    remove(second);
    expect(frame(document)).toBe('ab');
  });

  it('reflows after keyed children are reordered', () => {
    const { document, root, label } = mount();
    const second = text();
    insert(DOM.Document.createTextNode('cd'), second);
    insert(second, root);
    expect(frame(document)).toBe('abcd');

    // Vue moves a keyed child with `insert`, never `remove` + `insert`.
    insert(second, root, label);
    expect(frame(document)).toBe('cdab');
  });

  it('re-measures after a text node changes', () => {
    const { document, root, runs } = mount();
    // `flex-start` so the box shrinks to its measured content instead of
    // stretching to the document width -- the box's *size* is what proves the
    // text was re-measured, not merely repainted.
    patchProp(root, 'alignSelf', undefined, 'flex-start');
    patchProp(root, 'borderStyle', undefined, 'round');
    expect(frame(document)).toBe('╭──╮\n│ab│\n╰──╯');

    setText(runs, 'abcdef');
    expect(frame(document)).toBe('╭──────╮\n│abcdef│\n╰──────╯');
  });

  it('re-measures after setElementText replaces an element’s children', () => {
    const { document, root, label } = mount();
    patchProp(root, 'alignSelf', undefined, 'flex-start');
    patchProp(root, 'borderStyle', undefined, 'round');
    expect(frame(document)).toBe('╭──╮\n│ab│\n╰──╯');

    setElementText(label, 'abcdef');
    expect(frame(document)).toBe('╭──────╮\n│abcdef│\n╰──────╯');
  });

  it('reapplies styles when an element regains its Yoga node', () => {
    const { document, root, label } = mount();

    const inner = text();
    patchProp(inner, 'paddingLeft', undefined, 4);
    insert(DOM.Document.createTextNode('cd'), inner);

    // Framed as a sibling first, so its styles are applied and the element is
    // marked clean *before* it is moved.
    insert(inner, root);
    expect(frame(document)).toBe('ab    cd');

    // A `<Text>` nested inside another `<Text>` is virtual: `updateYogaOwnership`
    // frees its Yoga node outright.
    insert(inner, label);
    expect(frame(document)).toBe('abcd');

    // Moving it back out builds a *fresh* node carrying the reset defaults and
    // none of this element's own styles. Nothing about the move touches
    // `attributes`, so only `updateYogaOwnership` can re-dirty it.
    insert(inner, root);
    expect(frame(document)).toBe('ab    cd');
  });

  it('applies an attribute written through setScopeId', () => {
    const { document, root } = mount();
    expect(frame(document)).toBe('ab');

    // Scoped-CSS ids arrive as attributes too, on their own path into
    // `setAttribute`. `display` is used here because `setScopeId` always writes
    // `''`, and `display` is the one style whose empty value is visible:
    // `applyStyles` reads anything that is not `'flex'` as `DISPLAY_NONE`.
    setScopeId(root, 'display');
    expect(frame(document)).toBe('');
  });
});
