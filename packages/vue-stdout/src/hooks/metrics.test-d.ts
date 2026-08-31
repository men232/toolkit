import { expectTypeOf, test } from 'vitest';
import { useBoxMetrics } from './useBoxMetrics';
import { useContainerSize } from './useContainerSize';
import type { DOMElement } from '../tree';

const target = (): DOMElement | null => null;

/**
 * These refs are *reported* measurements: the next `layout`/`resize` event
 * overwrites them, so a write moves nothing and is silently reverted a frame
 * later. Typed read-only, it is a compile error instead.
 */
test('useBoxMetrics refs cannot be written to', () => {
  const metrics = useBoxMetrics(target);

  expectTypeOf(metrics.x.value).toEqualTypeOf<number>();

  // @ts-expect-error measurements are reported, not set
  metrics.x.value = 1;
  // @ts-expect-error measurements are reported, not set
  metrics.y.value = 1;
  // @ts-expect-error measurements are reported, not set
  metrics.width.value = 1;
  // @ts-expect-error measurements are reported, not set
  metrics.height.value = 1;
});

test('useContainerSize refs cannot be written to', () => {
  const size = useContainerSize(target);

  expectTypeOf(size.width.value).toEqualTypeOf<number>();

  // @ts-expect-error measurements are reported, not set
  size.width.value = 1;
  // @ts-expect-error measurements are reported, not set
  size.height.value = 1;
});
