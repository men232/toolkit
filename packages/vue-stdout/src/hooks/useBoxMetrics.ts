import { type MaybeRefOrGetter, type Ref, ref, toValue, watch } from 'vue';
import { type ElementMetrics, measureElement } from '../measureElement';
import type { DOMElement } from '../tree';
import { useEventListener } from './useEventListener';

const emptyMetrics: ElementMetrics = { x: 0, y: 0, width: 0, height: 0 };

/**
 * Every field is read-only: these are *reported* measurements, refreshed from
 * the tracked element's `layout` event, so a write here would move no box and
 * be overwritten by the next frame. Set the element's own styles to change its
 * geometry; this hook only reads it back.
 */
export interface UseBoxMetricsResult {
  /** Position within the live layout region, accumulated through every ancestor. */
  readonly x: Readonly<Ref<number>>;
  /** Position within the live layout region, accumulated through every ancestor. */
  readonly y: Readonly<Ref<number>>;
  /** Border-box width. */
  readonly width: Readonly<Ref<number>>;
  /** Border-box height. */
  readonly height: Readonly<Ref<number>>;
}

/**
 * Reactive `measureElement` (`src/measureElement.ts`): tracks `target`'s
 * border-box `width`/`height` and its `x`/`y` position within the live layout
 * region (accumulated up through every ancestor), refreshing whenever the
 * tracked element fires its `layout` event or `target` changes to point at a
 * different element. Ported from ink's `useBoxMetrics`, which instead reads
 * Yoga's computed layout off a React ref on every render.
 *
 * Deliberately `layout`, not the narrower `resize`: `x`/`y` are *position*,
 * not size, and a sibling above `target` growing shifts it down without
 * changing `target`'s own width or height, so `resize` would never fire and a
 * hook keyed on it would report a stale position forever. See
 * `useContainerSize` for the sibling hook that wants content-box size only,
 * no position, and so can stay on `resize`.
 *
 * **Refreshes once per frame the terminal is actually shown, which under a
 * `maxFps` cap is fewer times than the state behind it changed** -- the cap
 * skips the whole layout+paint pass, not only its write (`MountOptions.maxFps`).
 * The geometry that goes unreported belonged to frames nobody could see, so
 * what this returns is the geometry on screen, which is the same standard the
 * read-only refs above are held to. The settled value always arrives: a burst
 * that goes quiet gets its trailing frame, and so does one still mid-window
 * when the app exits. A `watch` on these refs therefore fires at the frame
 * rate, not the update rate; a measurement-driven layout that feeds its own
 * result back in settles one shown frame per step rather than one tick per
 * step. `test/max-fps.test.ts` holds all of it.
 *
 * Returns all-zero metrics while `target` is `null`/unset. Also zeros for an
 * element that has never been through a layout pass, and for a `<Text>` nested
 * inside another `<Text>`, which owns no Yoga node at all -- track the
 * outermost `<Text>` or an enclosing `<Box>` instead.
 */
export function useBoxMetrics(
  target: MaybeRefOrGetter<DOMElement | null>,
): UseBoxMetricsResult {
  const x = ref(0);
  const y = ref(0);
  const width = ref(0);
  const height = ref(0);

  const update = (node: DOMElement | null | undefined) => {
    const metrics = node ? measureElement(node) : emptyMetrics;

    x.value = metrics.x;
    y.value = metrics.y;
    width.value = metrics.width;
    height.value = metrics.height;
  };

  useEventListener(target, 'layout', () => {
    update(toValue(target));
  });

  watch(() => toValue(target), update, { immediate: true });

  return { x, y, width, height };
}
