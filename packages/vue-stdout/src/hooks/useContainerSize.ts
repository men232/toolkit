import { type MaybeRefOrGetter, type Ref, ref, toValue, watch } from 'vue';
import type { DOMElement } from '../tree';
import { useEventListener } from './useEventListener';

/**
 * Read-only for the same reason as `UseBoxMetricsResult`: these are reported
 * measurements, refreshed from the tracked element's `resize` event, so a
 * write resized nothing and the next frame reverted it.
 */
export interface UseContainerSizeResult {
  /** Content-box width -- the element's size less its border and padding. */
  readonly width: Readonly<Ref<number>>;
  /** Content-box height -- the element's size less its border and padding. */
  readonly height: Readonly<Ref<number>>;
}

/**
 * Tracks `target`'s **content-box** `width`/`height` -- its size *less* border
 * and padding, read off `getBoundingClientRect()`, which `src/tree/render.ts`
 * keeps in sync after every layout pass.
 *
 * Refreshes once per *shown* frame, and under a `maxFps` cap that is fewer
 * times than the state behind it changed -- see `useBoxMetrics`, which the
 * same reasoning and the same guarantee cover.
 *
 * Distinct from `useBoxMetrics`, not a duplicate: that one reports
 * **border-box** dimensions plus an ancestor-accumulated `x`/`y` position,
 * matching ink's public measurement API. This exists for the narrower case
 * `ProgressBar` needs -- how many *interior* cells are available inside a
 * bordered box, which the border-box width would overcount by the border
 * thickness. Reach for `useBoxMetrics` for anything ink-parity-shaped.
 */
export function useContainerSize(
  target: MaybeRefOrGetter<DOMElement | null>,
): UseContainerSizeResult {
  const width = ref(0);
  const height = ref(0);

  const computeSize = (node: DOMElement) => {
    const box = node.getBoundingClientRect();

    width.value = box.width;
    height.value = box.height;
  };

  useEventListener(target, 'resize', () => {
    computeSize(toValue(target)!);
  });

  watch(
    () => toValue(target),
    newNode => {
      if (newNode) computeSize(newNode);
    },
    { immediate: true },
  );

  return { width, height };
}
