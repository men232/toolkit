import { describe, expect, it, vi } from 'vitest';
import { Yoga, type YogaNode } from '../yoga';
import { DOM } from '.';
import { initYogaStyles, resetYogaStyles } from './DOMElement';

const el = (tag: string) => DOM.createElement(tag);

/**
 * Every style property Yoga will read back, so two nodes can be compared
 * without trusting a hand-written list of "the ones that matter".
 */
const EDGES = [
  'ALL',
  'HORIZONTAL',
  'VERTICAL',
  'START',
  'END',
  'LEFT',
  'RIGHT',
  'TOP',
  'BOTTOM',
] as const;

function dumpStyles(node: YogaNode): Record<string, unknown> {
  const yoga = Yoga as unknown as Record<string, number>;
  const out: Record<string, unknown> = {
    alignContent: node.getAlignContent(),
    alignItems: node.getAlignItems(),
    alignSelf: node.getAlignSelf(),
    aspectRatio: node.getAspectRatio(),
    boxSizing: node.getBoxSizing(),
    display: node.getDisplay(),
    flexBasis: node.getFlexBasis(),
    flexDirection: node.getFlexDirection(),
    flexGrow: node.getFlexGrow(),
    flexShrink: node.getFlexShrink(),
    flexWrap: node.getFlexWrap(),
    height: node.getHeight(),
    justifyContent: node.getJustifyContent(),
    maxHeight: node.getMaxHeight(),
    maxWidth: node.getMaxWidth(),
    minHeight: node.getMinHeight(),
    minWidth: node.getMinWidth(),
    overflow: node.getOverflow(),
    positionType: node.getPositionType(),
    width: node.getWidth(),
  };

  for (const edge of EDGES) {
    const value = yoga[`EDGE_${edge}`]!;
    out[`margin.${edge}`] = node.getMargin(value);
    out[`padding.${edge}`] = node.getPadding(value);
    out[`border.${edge}`] = node.getBorder(value);
    out[`position.${edge}`] = node.getPosition(value);
  }

  for (const gutter of ['ALL', 'COLUMN', 'ROW'] as const) {
    out[`gap.${gutter}`] = node.getGap(yoga[`GUTTER_${gutter}`]!);
  }

  return JSON.parse(JSON.stringify(out));
}

/**
 * `initYogaStyles` is `resetYogaStyles` minus every write a brand-new Yoga node
 * would only restate — 3 calls instead of 57, which is what took tree
 * construction from ~57 Yoga calls per element to ~6.
 *
 * The saving is only sound while the two really do agree on a fresh node, and
 * nothing in the type system says they must: adding a default to
 * `resetYogaStyles` that Yoga does not itself default to would silently leave
 * `initYogaStyles` behind, and every element would be built in a slightly wrong
 * state that the first layout pass then papers over — visible only for the one
 * element `prepareNode` never visits (a late descendant of an already-flushed
 * `<Static>` child).
 *
 * So this compares the two by *reading every property back*, rather than by
 * counting the calls or listing the three by hand.
 */
describe('initYogaStyles', () => {
  it('leaves a fresh Yoga node in exactly the state the full reset would', () => {
    const reset = Yoga.Node.create();
    const init = Yoga.Node.create();

    resetYogaStyles(reset);
    initYogaStyles(init);

    expect(dumpStyles(init)).toEqual(dumpStyles(reset));

    reset.free();
    init.free();
  });

  it('is a strict subset: the full reset is still needed on a node that has been styled', () => {
    // The other half of the contract. `initYogaStyles` must NOT be enough to
    // clear a used node -- that is what `prepareNode` calls `resetYogaStyles`
    // for, and swapping the two there would make a withdrawn `width` stick.
    const used = Yoga.Node.create();
    used.setWidth(20);
    used.setPadding(Yoga.EDGE_TOP, 3);

    initYogaStyles(used);

    expect(dumpStyles(used)).not.toEqual(dumpStyles(Yoga.Node.create()));

    resetYogaStyles(used);

    const fresh = Yoga.Node.create();
    initYogaStyles(fresh);
    expect(dumpStyles(used)).toEqual(dumpStyles(fresh));

    used.free();
    fresh.free();
  });

  it('is what a newly created element carries', () => {
    const element = el('stdout-box');
    const expected = Yoga.Node.create();
    initYogaStyles(expected);

    expect(dumpStyles(element.yogaNode!)).toEqual(dumpStyles(expected));

    expected.free();
  });
});

/**
 * `updateYogaOwnership` (`DOMElement.ts`) is the free/realloc/relink path that
 * keeps an element's Yoga node ownership matching ink's model: an inline
 * element (`stdout-text`) nested inside another inline element owns none at
 * all -- its content is folded into the outermost inline ancestor's own text
 * (`isVirtualText`, `src/tree/tags.ts`).
 *
 * Every `DOMNode#insertBefore` calls this on the moved node before linking it
 * into the new parent's Yoga tree, so both transitions are real and exercised
 * by ordinary Vue reparenting, not just a one-way "becomes virtual once and
 * stays that way" default.
 */
describe('DOMElement#updateYogaOwnership', () => {
  it('frees its Yoga node when it becomes virtual text (nested inside another inline element)', () => {
    const outer = el('stdout-text');
    const inner = el('stdout-text');

    const yogaNode = inner.yogaNode!;
    const free = vi.spyOn(yogaNode, 'free');

    expect(inner.yogaNode).not.toBeNull();

    outer.appendChild(inner);

    expect(inner.yogaNode).toBeNull();
    expect(free).toHaveBeenCalledTimes(1);
    expect(outer.yogaNode!.getChildCount()).toBe(0);
  });

  it('unlinks a virtual-text child that itself owns a Yoga node, not just the node being freed', () => {
    // `stdout-box` is never inline, so it always owns a Yoga node regardless of
    // where it sits -- this exercises the loop in the "losing ownership"
    // branch that detaches a still-owning child from the node about to be
    // freed, rather than just the trivial no-children case.
    const outer = el('stdout-text');
    const inner = el('stdout-text');
    const child = el('stdout-box');

    inner.appendChild(child);
    expect(inner.yogaNode!.getChildCount()).toBe(1);

    outer.appendChild(inner);

    expect(inner.yogaNode).toBeNull();
    // The child's own node survives -- only its former parent's is freed --
    // but is left unparented ("laid out nowhere", per the doc comment)
    // rather than dangling off a freed wasm pointer.
    expect(child.yogaNode).not.toBeNull();
    expect(child.yogaNode!.getParent()).toBeNull();
  });

  it('creates a fresh Yoga node when it stops being virtual text', () => {
    const outer = el('stdout-text');
    const inner = el('stdout-text');
    const container = el('stdout-box');

    outer.appendChild(inner);
    expect(inner.yogaNode).toBeNull();

    container.appendChild(inner);

    expect(inner.yogaNode).not.toBeNull();
    expect(container.yogaNode!.getChildCount()).toBe(1);
  });

  it('re-adopts a child laid out nowhere while virtual, once it regains a Yoga node', () => {
    const outer = el('stdout-text');
    const inner = el('stdout-text');
    const container = el('stdout-box');
    const child = el('stdout-box');

    inner.appendChild(child);
    outer.appendChild(inner);

    expect(inner.yogaNode).toBeNull();
    expect(child.yogaNode).not.toBeNull();
    expect(child.yogaNode!.getParent()).toBeNull();

    // Move `inner` out from under an inline ancestor into a non-inline one --
    // it regains a Yoga node, and `child` (never freed, just unparented
    // above) has to be relinked under the *new* node, not left orphaned.
    container.appendChild(inner);

    expect(inner.yogaNode).not.toBeNull();
    expect(inner.yogaNode!.getChildCount()).toBe(1);
    expect(child.yogaNode!.getParent()).not.toBeNull();
  });
});
