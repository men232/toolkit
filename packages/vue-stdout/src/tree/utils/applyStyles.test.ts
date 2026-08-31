import { describe, expect, it } from 'vitest';
import { DOM } from '../DOMTree';
import { computeLayout, getComputedRect } from '../layout';
import { renderToFrame } from '../render';

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

// Every case here asserts computed Yoga geometry (or, for the colour
// properties, rendered ANSI output) produced by a style `applyStyles` did not
// support before this task -- ink's `styles.ts` (7.1.1) does. See
// task-5-report.md for the full diff this file covers.
describe('applyStyles: ink parity additions', () => {
  describe('position', () => {
    it('absolute honors top/left offsets', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', {
          position: 'absolute',
          top: 2,
          left: 3,
          width: 2,
          height: 1,
        }),
      ]);
      computeLayout(root, 20);

      const child = getComputedRect(root.childNodes[0]);
      expect(child.x).toBe(3);
      expect(child.y).toBe(2);
    });

    it('honors percentage offsets, resolved against the parent', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { position: 'absolute', top: '50%', width: 2, height: 1 }),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).y).toBe(5);
    });

    it("static ignores top/left offsets, unlike absolute", () => {
      // ink: "When position is `static`, top/right/bottom/left are ignored."
      // Without `static`, an un-positioned box is `relative` -- also ignores
      // offsets, but for a different reason (no `POSITION_TYPE_STATIC` at
      // all existed before yoga-layout 3). This pins the new enum value
      // itself, not merely the pre-existing `relative` behaviour.
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', {
          position: 'static',
          top: 2,
          left: 3,
          width: 2,
          height: 1,
        }),
      ]);
      computeLayout(root, 20);

      const child = getComputedRect(root.childNodes[0]);
      expect(child.x).toBe(0);
      expect(child.y).toBe(0);
    });

    it('clears an offset on removal instead of leaving it stuck', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { position: 'absolute', top: 4, width: 2, height: 1 }),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).y).toBe(4);

      (root.childNodes[0] as any).removeAttribute('top');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).y).toBe(0);
    });
  });

  describe('alignContent', () => {
    it('positions wrapped flex lines explicitly', () => {
      // width:2 forces "aa" and "bb" onto separate lines under our
      // wrap-at-node-boundaries row default; height:10 gives alignContent
      // room to move the two-line block around.
      const root = el('stdout-box', { width: 2, height: 10, alignContent: 'center' }, [
        text('aa'),
        text('bb'),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).y).toBe(4);
      expect(getComputedRect(root.childNodes[1]).y).toBe(5);
    });

    it('clears back to the CSS-stretch default on removal', () => {
      const root = el('stdout-box', { width: 2, height: 10, alignContent: 'center' }, [
        text('aa'),
        text('bb'),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).y).toBe(4);

      root.removeAttribute('alignContent');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).y).toBe(0);
    });

    it('treats an explicit falsy value the same as the CSS-stretch default, not FLEX_START', () => {
      // `patchProp` deletes the attribute outright for `undefined`, so this
      // branch never sees that case in practice today -- but if it ever did
      // (e.g. an explicit `''`), it must agree with `resetYogaStyles`
      // (`DOMElement.ts`), which asserts `ALIGN_STRETCH` as the value an
      // element starts from, not Yoga's own `FLEX_START` default.
      const root = el('stdout-box', { width: 2, height: 10, alignContent: '' }, [
        text('aa'),
        text('bb'),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).y).toBe(0);
    });
  });

  describe('aspectRatio', () => {
    // `flexDirection: column`, not the default row: on the row axis our own
    // `flexWrap: wrap` divergence (`resetYogaStyles`) forces `alignContent:
    // stretch` for a lone flex line, which stretches the child's cross-axis
    // size (height, on the row axis) over whatever `aspectRatio` derived --
    // ink has no such default and is unaffected. Column keeps this test about
    // `aspectRatio`, not about that pre-existing, deliberate divergence.
    it('derives height from width', () => {
      const root = el('stdout-box', { width: 20, height: 10, flexDirection: 'column' }, [
        el('stdout-box', { width: 10, aspectRatio: 2 }),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).height).toBe(5);
    });

    it('clears on removal, collapsing back to the (empty) content height', () => {
      const root = el('stdout-box', { width: 20, height: 10, flexDirection: 'column' }, [
        el('stdout-box', { width: 10, aspectRatio: 2 }),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).height).toBe(5);

      (root.childNodes[0] as any).removeAttribute('aspectRatio');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).height).toBe(0);
    });
  });

  describe('maxWidth / maxHeight', () => {
    it('maxWidth clamps a width that would otherwise be larger', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { width: 15, maxWidth: 10 }),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).width).toBe(10);
    });

    it('clears maxWidth on removal, letting width grow back', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { width: 15, maxWidth: 10 }),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).width).toBe(10);

      (root.childNodes[0] as any).removeAttribute('maxWidth');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).width).toBe(15);
    });

    it('maxHeight clamps a height that would otherwise be larger', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { width: 2, height: 8, maxHeight: 4 }),
      ]);
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).height).toBe(4);
    });

    it('clears maxHeight on removal, letting height grow back', () => {
      const root = el('stdout-box', { width: 20, height: 10 }, [
        el('stdout-box', { width: 2, height: 8, maxHeight: 4 }),
      ]);
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).height).toBe(4);

      (root.childNodes[0] as any).removeAttribute('maxHeight');
      computeLayout(root, 20);
      expect(getComputedRect(root.childNodes[0]).height).toBe(8);
    });
  });

  describe('alignItems: baseline', () => {
    it('aligns items by their bottom-edge baseline, not the top', () => {
      // A leaf with no custom baseline function uses its own height as its
      // baseline (the bottom edge). Two items sharing a line get their
      // bottoms aligned: the shorter one (height 1) is pushed down to meet
      // the taller one's (height 3) bottom -- top=2, not top=0 as
      // `flex-start` would give both. No `flexWrap` override needed: with
      // `mirrorAlignItems` gone (it used to copy `alignItems` into
      // `alignContent` and had no `baseline` case), our WRAP-by-default row
      // axis no longer has any special-cased interaction with `alignItems`
      // to route around.
      const root = el(
        'stdout-box',
        { width: 20, height: 10, alignItems: 'baseline' },
        [el('stdout-box', { width: 2, height: 1 }), el('stdout-box', { width: 2, height: 3 })],
      );
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).y).toBe(2);
      expect(getComputedRect(root.childNodes[1]).y).toBe(0);
    });
  });

  describe('alignSelf', () => {
    it('stretch overrides the parent alignItems for one child', () => {
      // This is the case `mirrorAlignItems`'s removal fixed: with the mirror
      // in place, an explicit `alignItems: 'flex-start'` on the parent used
      // to drag `alignContent` down to `FLEX_START` too, making the single
      // flex line content-sized -- so `alignSelf: 'stretch'` had nothing to
      // stretch TO and measured height 0. `alignContent` now stays at its
      // `STRETCH` default (`resetYogaStyles`) regardless of `alignItems`, so
      // this passes under our ordinary WRAP-by-default row axis, no
      // `flexWrap` override required.
      const root = el(
        'stdout-box',
        { width: 20, height: 10, alignItems: 'flex-start' },
        [
          el('stdout-box', { width: 5, alignSelf: 'stretch' }),
          el('stdout-box', { width: 5 }),
        ],
      );
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).height).toBe(10);
      // The sibling without an override stays content-sized under the
      // parent's plain `flex-start` -- proof the first child's height came
      // from ITS `alignSelf`, not from some other default.
      expect(getComputedRect(root.childNodes[1]).height).toBe(0);
    });

    it('baseline overrides the parent alignItems for one child', () => {
      // Values measured under our actual default (WRAP on the row axis, no
      // `flexWrap` override): a plain `alignItems: 'center'` sibling lands at
      // y=5, not y=1 as it would under `flexWrap: 'nowrap'` -- WRAP vs
      // NO_WRAP measurably changes how Yoga distributes a mixed
      // baseline/center line even when nothing actually wraps, the same
      // family of WRAP-sensitivity that motivated `mirrorAlignItems` in the
      // first place. Pinning the value our real engine produces, not the
      // one an escape hatch would.
      const root = el(
        'stdout-box',
        { width: 20, height: 10, alignItems: 'center' },
        [
          el('stdout-box', { width: 2, height: 1 }),
          el('stdout-box', { width: 2, height: 3, alignSelf: 'baseline' }),
        ],
      );
      computeLayout(root, 20);

      expect(getComputedRect(root.childNodes[0]).y).toBe(5); // still centred
      expect(getComputedRect(root.childNodes[1]).y).toBe(0); // baseline, not centred
    });
  });

  describe('border background colors', () => {
    it('paints borderBackgroundColor across the whole border', () => {
      const root = el('stdout-box', {
        borderStyle: 'single',
        borderBackgroundColor: 'blue',
        width: 4,
        height: 3,
      });
      const frame = renderToFrame(root, 4);

      // chalk.bgBlue's opening SGR code -- proof the border was actually
      // painted with a background, not merely that a prop was accepted.
      expect(frame).toContain('[44m');
    });

    it('lets a per-side background color override the shorthand', () => {
      const root = el('stdout-box', {
        borderStyle: 'single',
        borderBackgroundColor: 'blue',
        borderTopBackgroundColor: 'green',
        width: 4,
        height: 3,
      });
      const frame = renderToFrame(root, 4);
      const lines = frame.split('\n');

      expect(lines[0]).toContain('[42m'); // top: overridden to green
      expect(lines[0]).not.toContain('[44m');
      expect(lines[1]).toContain('[44m'); // sides: still the shorthand
    });
  });
});
