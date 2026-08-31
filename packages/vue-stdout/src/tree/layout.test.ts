import { describe, expect, it } from 'vitest';
import { DOM } from './DOMTree';
import { computeLayout, getComputedRect, getTextWrapStyle } from './layout';

const el = (tag: string, attrs: Record<string, any> = {}, kids: any[] = []) => {
  const node = DOM.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const kid of kids) node.appendChild(kid);
  return node;
};
const text = (s: string) => {
  const span = DOM.createElement('stdout-text');
  span.appendChild(DOM.createTextNode(s));
  return span;
};

describe('layout model', () => {
  it('defaults flexDirection to row, not Yoga\'s column default', () => {
    const root = el('stdout-box', {}, [text('aa'), text('bb')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).y).toBe(0);
    expect(getComputedRect(root.childNodes[1]).y).toBe(0);
  });

  it('honours flexDirection=column', () => {
    const root = el('stdout-box', { flexDirection: 'column' }, [text('aa'), text('bb')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[1]).y).toBe(1);
  });

  it('honours justifyContent=center', () => {
    const root = el('stdout-box', { justifyContent: 'center', width: 12 }, [text('aa'), text('bb')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).x).toBe(4);
  });

  it('honours gap', () => {
    const root = el('stdout-box', { gap: 2 }, [text('aa'), text('bb')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[1]).x).toBe(4);
  });

  it('honours alignItems=center under our WRAP-by-default row axis', () => {
    // A lone flex line under WRAP is sized by `alignContent`, not
    // `alignItems` -- `resetYogaStyles` defaults `alignContent` to CSS's own
    // `stretch`, which fills the height-3 container, and `alignItems: center`
    // then centres the item inside that line: y=1.
    const root = el('stdout-box', { alignItems: 'center', height: 3 }, [text('aa')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).y).toBe(1);
  });

  it('honours alignItems=flex-end under our WRAP-by-default row axis', () => {
    const root = el('stdout-box', { alignItems: 'flex-end', height: 3 }, [text('aa')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).y).toBe(2);
  });

  it('lets alignSelf=stretch fill the cross axis under a wrapping parent', () => {
    // Pins that `alignContent` stays at its `STRETCH` reset regardless of what
    // `alignItems` says. Were it dragged down to `FLEX_START` to match, the
    // single flex line would be content-sized and the child's
    // `alignSelf: 'stretch'` would have nothing to stretch to — height 0
    // instead of the container's 10.
    const root = el('stdout-box', { alignItems: 'flex-start', height: 10 }, [
      el('stdout-box', { alignSelf: 'stretch' }, [text('aa')]),
    ]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).height).toBe(10);
  });

  it('preserves the deliberate divergence: siblings wrap instead of shrinking', () => {
    const root = el('stdout-box', { width: 5 }, [text('aaa'), text('bbb')]);
    computeLayout(root, 20);
    // ink would squeeze both onto one line via flexShrink: 1
    expect(getComputedRect(root.childNodes[1]).y).toBe(1);
  });

  it('overflows a constrained column instead of starting a second column', () => {
    // Our wrap-at-node-boundaries divergence is confined to the ROW axis. On
    // the column axis wrapping would put the overflowing child in a second
    // column *beside* the first, which is surprising in a TUI; ink overflows,
    // and so do we — the author can opt into `overflow: hidden`.
    const root = el('stdout-box', { flexDirection: 'column', height: 2 }, [
      el('stdout-box', { height: 2 }, [text('aa')]),
      el('stdout-box', { height: 2 }, [text('bb')]),
    ]);
    computeLayout(root, 20);

    const second = getComputedRect(root.childNodes[1]);

    // Stacked below the first and overflowing the height-2 container...
    expect(second.y).toBe(2);
    // ...not moved into a new column beside it.
    expect(second.x).toBe(0);
  });

  it('stretches children across the cross axis, like CSS and ink', () => {
    // A child of a fixed-width column box fills that width. Needs
    // `alignContent: stretch`, because our default `flexWrap: wrap` makes
    // `alignContent` -- not `alignItems` -- the property that sizes the line.
    const root = el('stdout-box', { width: 20, flexDirection: 'column' }, [
      el('stdout-box', {}, [text('ab')]),
    ]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[0]).width).toBe(20);
  });

  it('stacks top-level blocks when the document is the layout root', () => {
    const doc = DOM.createDocument();
    doc.appendChild(el('stdout-box', {}, [text('aa')]));
    doc.appendChild(el('stdout-box', {}, [text('bb')]));
    computeLayout(doc, 20);
    expect(getComputedRect(doc.childNodes[1]).y).toBe(1);
  });

  it('skips node-less children when mapping DOM order onto Yoga order', () => {
    // Text and comment nodes own no Yoga node, so the Yoga child list is a
    // subsequence of childNodes rather than a parallel array.
    const root = el('stdout-box');
    root.appendChild(DOM.createTextNode('ignored'));
    const first = text('aa');
    root.appendChild(first);
    root.appendChild(DOM.createComment('c'));
    const second = text('bb');
    root.appendChild(second);
    computeLayout(root, 20);
    expect(root.yogaNode!.getChildCount()).toBe(2);
    expect(getComputedRect(first).x).toBe(0);
    expect(getComputedRect(second).x).toBe(2);
  });

  it('re-measures after the text changes', () => {
    // Yoga caches measure-function results until the node is dirtied, and
    // re-setting the function does not dirty it.
    const span = text('aa');
    const root = el('stdout-box', {}, [span]);
    computeLayout(root, 20);
    expect(getComputedRect(span).width).toBe(2);

    span.childNodes[0].textContent = 'aaaaaa';
    computeLayout(root, 20);
    expect(getComputedRect(span).width).toBe(6);
  });

  it('re-measures when an ancestor changes the cascading textWrap', () => {
    // `textWrap` is not a Yoga style, and it cascades: it is read by
    // `getTextWrapStyle` from the nearest ancestor that sets it. So changing it
    // on a `<Box>` alters what its `<Text>` descendant measures to without
    // touching that descendant at all -- and Yoga answers from its per-node
    // measurement cache rather than calling the measure function again. The
    // measure guard has to key on the resolved wrap mode as well as the text.
    const span = text('aaa bbb ccc');
    const root = el('stdout-box', { width: 6 }, [span]);
    computeLayout(root, 20);
    expect(getComputedRect(span).height).toBe(3);

    root.setAttribute('textWrap', 'truncate');
    computeLayout(root, 20);
    expect(getComputedRect(span).height).toBe(1);
    expect(getComputedRect(span).width).toBe(6);

    root.removeAttribute('textWrap');
    computeLayout(root, 20);
    expect(getComputedRect(span).height).toBe(3);
  });

  it('drops a stale measure function when an element gains element children', () => {
    // Yoga hard-aborts on insertChild into a node with a measure function.
    const span = text('aa');
    const root = el('stdout-box', {}, [span]);
    computeLayout(root, 20);

    expect(() => span.appendChild(text('bb'))).not.toThrow();
    computeLayout(root, 20);
  });

  it('forgets a removed style on the next pass', () => {
    // Yoga nodes outlive a single layout pass, so defaults have to be
    // re-asserted rather than assumed fresh.
    const root = el('stdout-box', { flexDirection: 'column' }, [text('aa'), text('bb')]);
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[1]).y).toBe(1);

    root.removeAttribute('flexDirection');
    computeLayout(root, 20);
    expect(getComputedRect(root.childNodes[1]).y).toBe(0);
  });

  describe('a removed style is cleared, not merely skipped', () => {
    // `applyStyles` guards every setter with `'x' in style`, so a property that
    // disappears is skipped, not cleared. These pin `resetYogaStyles`, which is
    // what makes `<Box :width="wide ? 20 : undefined">` shrink back on flip.

    it('clears width', () => {
      // Asserted on a *child*: `computeLayout` sets the root's width from its
      // `width` argument whenever the root carries no width style, which would
      // mask a missing reset and make this test pass either way.
      const child = el('stdout-box', { width: 20 }, [text('aa')]);
      const root = el('stdout-box', {}, [child]);
      computeLayout(root, 40);
      expect(getComputedRect(child).width).toBe(20);

      child.removeAttribute('width');
      computeLayout(root, 40);
      expect(getComputedRect(child).width).toBe(2);
    });

    it('clears padding', () => {
      const root = el('stdout-box', { padding: 2 }, [text('aa')]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).x).toBe(2);

      root.removeAttribute('padding');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).x).toBe(0);
    });

    it('clears justifyContent', () => {
      const root = el('stdout-box', { justifyContent: 'center', width: 12 }, [text('aa')]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).x).toBe(5);

      root.removeAttribute('justifyContent');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).x).toBe(0);
    });

    it('clears a single margin edge without breaking the margin shorthand', () => {
      // The edges are reset with `undefined`, not `0`: a `0` written into
      // EDGE_TOP out-ranks a later `margin` shorthand and would silently win.
      const root = el('stdout-box', { marginTop: 3 }, [text('aa')]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).y).toBe(0);
      expect(getComputedRect(root).y).toBe(3);

      root.removeAttribute('marginTop');
      root.setAttribute('margin', 1);
      computeLayout(root, 20);
      expect(getComputedRect(root).y).toBe(1);
    });

    it('clears the width a layout root was given, once it is no longer the root', () => {
      // `computeLayout` writes the available width straight onto the layout
      // root's Yoga node -- the one style write in the engine that does not go
      // through `applyStyles`. An element that has taken one is no longer in
      // the untouched state `resetYogaStyles` would restore it to, so the next
      // application has to run the full reset. Skipping it leaves the element
      // stuck at the width it was last laid out as a root at.
      const box = el('stdout-box', {}, [text('aa')]);
      computeLayout(box, 40);
      expect(getComputedRect(box).width).toBe(40);

      const root = el('stdout-box', {}, [box]);
      box.setAttribute('flexDirection', 'column');
      computeLayout(root, 40);

      expect(getComputedRect(box).width).toBe(2);
    });

    it('clears display:none rather than leaving the element hidden', () => {
      const root = el('stdout-box', {}, [
        el('stdout-box', { display: 'none' }, [text('aa')]),
        text('bb'),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).width).toBe(0);

      (root.childNodes[0] as any).removeAttribute('display');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).width).toBe(2);
    });
  });
});

describe('getTextWrapStyle', () => {
  // ink itself has no multi-level cascade to match here (see the doc comment
  // on `getTextWrapStyle`, `layout.ts`) -- `textWrap` set on a `<Box>` at all
  // is this project's own addition, not something ink's own behaviour could
  // be checked against for how many ancestors it walks. These are unit
  // tests, not parity cases, for exactly that reason.

  it('reads its own textWrap first', () => {
    const leaf = text('hello');
    leaf.setAttribute('textWrap', 'truncate');
    el('stdout-box', { textWrap: 'wrap' }, [leaf]);
    expect(getTextWrapStyle(leaf)).toBe('truncate');
  });

  it('falls back to the immediate parent', () => {
    const leaf = text('hello');
    el('stdout-box', { textWrap: 'truncate' }, [leaf]);
    expect(getTextWrapStyle(leaf)).toBe('truncate');
  });

  it('walks past a parent with no textWrap to a grandparent that sets one', () => {
    const leaf = text('hello');
    const middle = el('stdout-box', {}, [leaf]);
    el('stdout-box', { textWrap: 'truncate-end' }, [middle]);
    expect(getTextWrapStyle(leaf)).toBe('truncate-end');
  });

  it('walks arbitrarily many levels up', () => {
    const leaf = text('hello');
    let node = el('stdout-box', {}, [leaf]);
    for (let i = 0; i < 5; i++) {
      node = el('stdout-box', {}, [node]);
    }
    el('stdout-box', { textWrap: 'middle' }, [node]);
    expect(getTextWrapStyle(leaf)).toBe('middle');
  });

  it('an intervening ancestor wins over one further up', () => {
    const leaf = text('hello');
    const middle = el('stdout-box', { textWrap: 'truncate-start' }, [leaf]);
    el('stdout-box', { textWrap: 'truncate-end' }, [middle]);
    expect(getTextWrapStyle(leaf)).toBe('truncate-start');
  });

  it('defaults to wrap when nothing in the chain sets textWrap', () => {
    const leaf = text('hello');
    el('stdout-box', {}, [leaf]);
    expect(getTextWrapStyle(leaf)).toBe('wrap');
  });

  it('defaults to wrap for a detached element with no parent at all', () => {
    const leaf = text('hello');
    expect(getTextWrapStyle(leaf)).toBe('wrap');
  });
});
