import { describe, expect, it, vi } from 'vitest';
import { DOM, type DOMElement } from '../src/tree/DOMTree';
import { renderToFrame } from '../src/tree/render';

/**
 * `syncBoundingClientRect` (`src/tree/render.ts`) used to run for every element
 * on every frame; it now runs only for elements with a `layout` or `resize`
 * subscriber, and `getBoundingClientRect()` computes from Yoga on read instead
 * of being served from what that walk last cached.
 *
 * Both halves can fail silently — a rect that is merely stale still looks like
 * a rect — so these pin the two directly: the public read is correct for an
 * element the walk never touches, and the events still reach anything that
 * subscribes, whenever it subscribed.
 */
describe('getBoundingClientRect and its events', () => {
  const build = () => {
    const document = DOM.Document.createDocument();
    const root = DOM.createElement('stdout-box');
    root.setAttribute('flexDirection', 'column');

    const first = DOM.createElement('stdout-box');
    first.setAttribute('borderStyle', 'round');
    first.setAttribute('paddingX', 2);
    first.setAttribute('width', 20);
    first.setAttribute('height', 5);

    const second = DOM.createElement('stdout-box');
    second.setAttribute('width', 10);
    second.setAttribute('height', 1);

    root.appendChild(first);
    root.appendChild(second);
    document.appendChild(root);

    return { document, root, first, second };
  };

  const frame = (document: ReturnType<typeof build>['document']) =>
    renderToFrame(document, 40);

  it('reports the content box of an element nothing subscribes to', () => {
    const { document, first } = build();
    frame(document);

    expect(first.listenerCount('layout')).toBe(0);

    // Border 1 each side plus paddingX 2: 20 - 2 - 4 = 14 wide, 5 - 2 = 3 tall.
    expect(first.getBoundingClientRect()).toEqual({
      x: 3,
      y: 1,
      width: 14,
      height: 3,
    });
  });

  it('reports zeros, not NaN, before any layout pass has run', () => {
    const { first } = build();

    // Yoga answers `NaN` for a node it has never laid out.
    expect(first.getBoundingClientRect()).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });

  it('fires layout on every frame for a subscriber', () => {
    const { document, first } = build();
    const onLayout = vi.fn();

    first.on('layout', onLayout);

    frame(document);
    frame(document);

    expect(onLayout).toHaveBeenCalledTimes(2);
  });

  it('fires layout for a subscriber that arrived after several frames', () => {
    const { document, first } = build();
    frame(document);
    frame(document);

    const onLayout = vi.fn();
    first.on('layout', onLayout);

    frame(document);

    expect(onLayout).toHaveBeenCalledTimes(1);
  });

  it('fires resize only when the size changes, not the position', () => {
    const { document, root, first, second } = build();
    const onResize = vi.fn();

    second.on('resize', onResize);

    frame(document);
    expect(onResize).toHaveBeenCalledTimes(1); // 0x0 -> 10x1

    frame(document);
    expect(onResize).toHaveBeenCalledTimes(1);

    // A sibling growing moves `second` down without resizing it.
    first.setAttribute('height', 8);
    frame(document);
    expect(onResize).toHaveBeenCalledTimes(1);
    expect((second as DOMElement).getBoundingClientRect().y).toBe(8);

    second.setAttribute('width', 12);
    frame(document);
    expect(onResize).toHaveBeenCalledTimes(2);

    expect(root.getBoundingClientRect().width).toBe(40);
  });
});
