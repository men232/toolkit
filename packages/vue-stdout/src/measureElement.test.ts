import { describe, expect, it } from 'vitest';
import { measureElement } from './measureElement';
import { computeLayout } from './tree/layout';
import { DOM } from './tree/DOMTree';

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

describe('measureElement', () => {
  it('reports width/height and a position accumulated up through every ancestor', () => {
    const grandchild = el('stdout-box', {
      position: 'absolute',
      left: 1,
      top: 1,
      width: 2,
      height: 2,
    });
    const child = el(
      'stdout-box',
      { position: 'absolute', left: 3, top: 2, width: 5, height: 4 },
      [grandchild],
    );
    const root = el('stdout-box', { width: 20, height: 10 }, [child]);

    computeLayout(root, 20);

    expect(measureElement(grandchild)).toEqual({
      x: 4,
      y: 3,
      width: 2,
      height: 2,
    });
  });

  it('normalises to 0, not NaN, for a real element that has never been laid out', () => {
    // A freshly created node owns a Yoga node but has never gone through
    // `calculateLayout`, so its computed dimensions are Yoga's own
    // "undefined" sentinel (`NaN`) -- this normalises that sentinel to `0`,
    // matching ink's documented (if not actually delivered) contract.
    const root = el('stdout-box', {}, [text('hi')]);

    const metrics = measureElement(root);

    expect(metrics).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('returns all-zero metrics for a <Text> nested inside another <Text>', () => {
    // Per the text model this package adopted from ink (`src/tree/tags.ts`),
    // a nested inline element is "virtual" and owns no Yoga node at all.
    const inner = el('stdout-text', {}, [text('nested')]);
    const outer = el('stdout-text', {}, [inner]);

    computeLayout(outer, 20);

    expect(inner.yogaNode).toBeNull();
    expect(measureElement(inner)).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });
});
