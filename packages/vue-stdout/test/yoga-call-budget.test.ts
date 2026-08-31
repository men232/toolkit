import { afterAll, describe, expect, it } from 'vitest';
import { DOM } from '../src/tree/DOMTree';
import type { DOMElement } from '../src/tree/DOMTree/DOMElement';
import { renderToFrame } from '../src/tree/render';
import { Yoga } from '../src/tree/yoga';

/**
 * A budget on **Yoga calls per element per frame**, which is the number that
 * actually governs this engine's speed.
 *
 * A 2026-08-31 audit found the frame cost ~88 Yoga calls per element to ink's
 * ~7, and that ~26 % of all CPU went on crossing the JS↔WASM boundary against
 * ~4 % inside Yoga's own compiled maths. Nothing in this repository measured
 * anything, so an 88-calls-per-element frame survived the whole of this
 * engine's development unnoticed. This is the smallest thing that would have
 * caught it.
 *
 * It asserts a **count**, not a duration, so it is deterministic and belongs in
 * the ordinary suite rather than behind `SKIP_PERFORMANCE_TEST` (the
 * monorepo's convention for wall-clock assertions, `packages/core`
 * `base62Fast.test.ts`). Timing tests flake; this one cannot.
 *
 * The ceiling is deliberately loose — it is a tripwire for a change of shape
 * (work moving back into the per-frame walk), not a target to optimise against.
 * Lowering it as the engine improves is fine; raising it needs a reason.
 */
describe('Yoga call budget', () => {
  const proto = (Yoga as unknown as { Node: { prototype: object } }).Node
    .prototype;

  const counts = new Map<string, number>();
  const originals = new Map<string, (...args: unknown[]) => unknown>();
  let counting = false;

  for (const key of Object.getOwnPropertyNames(proto)) {
    const descriptor = Object.getOwnPropertyDescriptor(proto, key)!;

    if (typeof descriptor.value !== 'function' || key === 'constructor') {
      continue;
    }

    const original = descriptor.value as (...args: unknown[]) => unknown;
    originals.set(key, original);

    Object.defineProperty(proto, key, {
      ...descriptor,
      value: function (this: unknown, ...args: unknown[]) {
        if (counting) counts.set(key, (counts.get(key) ?? 0) + 1);
        return original.apply(this, args);
      },
    });
  }

  afterAll(() => {
    for (const [key, original] of originals) {
      Object.defineProperty(proto, key, {
        configurable: true,
        writable: true,
        enumerable: false,
        value: original,
      });
    }
  });

  /** 10x10 grid of bordered, padded, coloured cells -- 211 elements. */
  const buildGrid = () => {
    const document = DOM.Document.createDocument();
    const root = DOM.createElement('stdout-box');
    root.setAttribute('flexDirection', 'column');
    let elements = 1;

    for (let row = 0; row < 10; row++) {
      const rowBox = DOM.createElement('stdout-box');
      rowBox.setAttribute('flexDirection', 'row');
      rowBox.setAttribute('gap', 1);
      elements++;

      for (let column = 0; column < 10; column++) {
        const cell = DOM.createElement('stdout-box');
        cell.setAttribute('borderStyle', 'round');
        cell.setAttribute('paddingX', 1);
        cell.setAttribute('width', 8);
        elements++;

        const label = DOM.createElement('stdout-text');
        label.setAttribute('color', 'green');
        label.appendChild(DOM.createTextNode(`${row}.${column}`));
        elements++;

        cell.appendChild(label);
        rowBox.appendChild(cell);
      }

      root.appendChild(rowBox);
    }

    document.appendChild(root);

    return { document, elements };
  };

  const measure = (frame: () => void) => {
    counts.clear();
    counting = true;
    frame();
    counting = false;

    return {
      total: [...counts.values()].reduce((sum, n) => sum + n, 0),
      counts: new Map(counts),
    };
  };

  it('stays under the per-element call budget while building the tree', () => {
    // Construction is the *other* half of the engine's Yoga traffic, and the
    // repaint budget above cannot see it: a frame of an already-built tree is
    // measured, so work moved into the constructor disappears from it entirely.
    //
    // On this grid it was **56** calls per element, all but 7 of them from
    // `resetYogaStyles` running over a node fresh out of `Yoga.Node.create()`
    // and writing Yoga's own defaults back over themselves. **7** today; ink's
    // equivalent build is 6-8. What is left is one `create`, the three writes
    // where our defaults differ from Yoga's (`initYogaStyles`), one
    // `setMeasureFunc(null)` and one `insertChild` per node, plus the
    // `getParent` that unlinks it from any previous parent first — i.e. the
    // tree model itself. The ceiling keeps ~2x headroom, like the one below.
    let elements = 0;
    const { total } = measure(() => {
      elements = buildGrid().elements;
    });

    expect(total / elements).toBeLessThan(15);
  });

  it('stays under the per-element call budget on the first layout pass', () => {
    // The third half of the engine's Yoga traffic, and neither budget above can
    // see it: construction is measured before any layout runs, and the repaint
    // budget is measured after one has. The first `computeLayout` over a
    // never-laid-out tree is where `prepareNode` applies every element's styles
    // for the first time, and it is 60-80 % of first paint.
    //
    // It was **53** calls per element on this grid, of which a measured 98 %
    // wrote a value the node already held: `prepareNode` ran the full
    // `resetYogaStyles` (52 writes) over nodes fresh out of the `DOMElement`
    // constructor, which `initYogaStyles` has already left in exactly the state
    // the reset writes. Same waste as the constructor's, one phase later.
    //
    // **13.7** today, against the 10.3 of the steady repaint below. The whole
    // 3.4 difference is this grid's own styles applied once -- `setBorder` four
    // times for each of the 100 bordered cells, one `setPadding` and one
    // `setWidth` each -- which is the definition of the work. A count, not a
    // duration; the ceiling keeps the same ~2x headroom as the other two.
    const { document, elements } = buildGrid();

    const { total } = measure(() => {
      renderToFrame(document, 120);
    });

    expect(total / elements).toBeLessThan(30);
  });

  it('writes no styles at all on a repaint of an unchanged tree', () => {
    const { document } = buildGrid();
    renderToFrame(document, 120);

    const { counts: repaint } = measure(() => {
      renderToFrame(document, 120);
    });

    // These setters live in `resetYogaStyles`/`applyStyles` and nowhere else,
    // so a non-zero count here means the per-frame style walk is back. (Nothing
    // asserts `setWidth`: `computeLayout` writes the available width onto the
    // layout root every pass by design.)
    for (const setter of [
      'setMargin',
      'setPadding',
      'setBorder',
      'setGap',
      'setFlexDirection',
      'setFlexWrap',
      'setAlignContent',
      'setAlignItems',
      'setPositionType',
      'setDisplay',
    ]) {
      expect([setter, repaint.get(setter) ?? 0]).toEqual([setter, 0]);
    }
  });

  it('stays under the per-element call budget on a steady repaint', () => {
    const { document, elements } = buildGrid();
    renderToFrame(document, 120);

    const { total } = measure(() => {
      renderToFrame(document, 120);
    });

    // ~10.3 today: ~85 before styles stopped being reapplied every frame, ~18
    // after that and after `syncBoundingClientRect` was gated, and ~10 once
    // each element's rect was read off Yoga once per frame instead of ~3 times.
    // ink's equivalent frame is ~5. The ceiling keeps the same ~2.4x headroom
    // it had at 45 -- see this file's header.
    expect(total / elements).toBeLessThan(25);
  });

  it('reapplies styles for the changed element only', () => {
    const { document } = buildGrid();
    renderToFrame(document, 120);

    const cell = document.childNodes[0]!.childNodes[0]!
      .childNodes[0] as DOMElement;

    const { counts: afterChange } = measure(() => {
      cell.setAttribute('paddingX', 2);
      renderToFrame(document, 120);
    });

    // `RESETTABLE_EDGES` is nine slots, cleared for each of margin/padding/
    // border, so one restyled element is nine `setBorder` calls plus whatever
    // `applyStyles` writes back. One element's worth, not the tree's.
    expect(afterChange.get('setBorder')).toBeLessThan(20);
    expect(afterChange.get('setPadding')).toBeGreaterThan(0);
  });
});
