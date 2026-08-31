import { effectScope, nextTick, shallowRef } from 'vue';
import { describe, expect, it } from 'vitest';
import { useBoxMetrics } from './useBoxMetrics';
import { computeLayout } from '../tree/layout';
import { DOM } from '../tree/DOMTree';
import type { DOMElement } from '../tree/DOMTree';

const el = (tag: string, attrs: Record<string, any> = {}, kids: any[] = []) => {
  const node = DOM.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const kid of kids) node.appendChild(kid);
  return node;
};

describe('useBoxMetrics', () => {
  it('reports all-zero metrics while the target is unset', () => {
    const scope = effectScope();

    const metrics = scope.run(() => useBoxMetrics(() => null))!;

    expect(metrics.x.value).toBe(0);
    expect(metrics.y.value).toBe(0);
    expect(metrics.width.value).toBe(0);
    expect(metrics.height.value).toBe(0);

    scope.stop();
  });

  it('measures the target as soon as one is provided', () => {
    const root = el('stdout-box', { position: 'absolute', left: 2, top: 1, width: 6, height: 3 });
    computeLayout(root, 20);

    const scope = effectScope();
    const metrics = scope.run(() => useBoxMetrics(() => root))!;

    expect(metrics.x.value).toBe(2);
    expect(metrics.y.value).toBe(1);
    expect(metrics.width.value).toBe(6);
    expect(metrics.height.value).toBe(3);

    scope.stop();
  });

  it('re-measures when the tracked element fires layout', () => {
    const root = el('stdout-box', { position: 'absolute', left: 0, top: 0, width: 6, height: 3 });
    computeLayout(root, 20);

    const scope = effectScope();
    const metrics = scope.run(() => useBoxMetrics(() => root))!;

    expect(metrics.width.value).toBe(6);

    // Simulate a relayout that grows the element, then fire the same event
    // `src/tree/render.ts` fires on a real render pass.
    root.setAttribute('width', 10);
    computeLayout(root, 20);
    root.emit('layout');

    expect(metrics.width.value).toBe(10);

    scope.stop();
  });

  it('re-measures position when a sibling above it grows, even though its own size is unchanged', () => {
    // Regression test: `resize` (the event `useBoxMetrics` used to listen to)
    // only fires when *this* element's own size changes. A box shifting
    // because a sibling above it grew changes only its position -- `x`/`y`
    // -- so a hook keyed on `resize` would never refresh and would report a
    // stale position forever. `layout` fires every frame the element is
    // painted, size-changed or not, which is what actually keeps `x`/`y`
    // live.
    const sibling = el('stdout-box', {
      position: 'relative',
      width: 6,
      height: 2,
    });
    const tracked = el('stdout-box', {
      position: 'relative',
      width: 6,
      height: 3,
    });
    const parent = el('stdout-box', { flexDirection: 'column' }, [sibling, tracked]);
    computeLayout(parent, 20);

    const scope = effectScope();
    const metrics = scope.run(() => useBoxMetrics(() => tracked))!;

    expect(metrics.y.value).toBe(2);
    expect(metrics.width.value).toBe(6);
    expect(metrics.height.value).toBe(3);

    // Sibling grows; `tracked` itself keeps the same width/height, only its
    // position shifts down.
    sibling.setAttribute('height', 5);
    computeLayout(parent, 20);

    // A real render pass fires `layout` on every painted element -- simulate
    // that instead of reaching into `src/tree/render.ts`'s paint pass.
    tracked.emit('layout');

    expect(metrics.y.value).toBe(5);
    expect(metrics.width.value).toBe(6);
    expect(metrics.height.value).toBe(3);

    scope.stop();
  });

  it('switches targets, and stops listening on the previous one', async () => {
    const first = el('stdout-box', { position: 'absolute', left: 0, top: 0, width: 4, height: 2 });
    const second = el('stdout-box', { position: 'absolute', left: 5, top: 5, width: 8, height: 4 });
    computeLayout(first, 20);
    computeLayout(second, 20);

    const target = shallowRef<DOMElement | null>(first);
    const scope = effectScope();
    const metrics = scope.run(() => useBoxMetrics(target))!;

    expect(metrics.width.value).toBe(4);

    target.value = second;
    // Both this hook's own watcher (re-measures) and `useEventListener`'s
    // (moves the `resize` subscription) are default-flush and so only run
    // on the next tick, not synchronously off the assignment above.
    await nextTick();

    expect(metrics.x.value).toBe(5);
    expect(metrics.width.value).toBe(8);

    // The old target no longer drives these refs.
    first.emit('layout');
    expect(metrics.width.value).toBe(8);

    scope.stop();
  });
});
