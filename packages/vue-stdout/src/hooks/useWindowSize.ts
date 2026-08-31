// Ported from ink's `src/hooks/use-window-size.ts`. `Container.syncWindowSize`
// already re-flows Yoga and schedules a frame, so a purely declarative flex
// layout reacts to a resize without this hook -- but that frame re-renders the
// *same* vnodes, so a component doing arithmetic on `stdout.columns` in JS
// reads a plain property, registers no reactive dependency, and stays pinned
// to its mount-time width forever. This is the reactive read path for that
// case.
//
// It derives from `Container.windowSize` rather than subscribing to the
// stream itself. That single shared subscription is the whole design (see
// `Container.windowSize` for why): it keeps the listener count at one
// regardless of how many components call this, and it makes what this reports
// the same number the layout was computed at by construction rather than by
// two code paths agreeing to read `stdout` the same way.
import { type ComputedRef, computed } from 'vue';
import { useStdoutContext } from '../context';

export type { WindowSize } from '../Container';

export interface UseWindowSizeResult {
  /**
   * The terminal's current width in character cells.
   *
   * Read-only: the terminal owns its own size, so a write here would be a
   * local lie that the next `'resize'` event silently reverted.
   */
  readonly columns: ComputedRef<number>;
  /** The terminal's current height in character cells. Read-only, as above. */
  readonly rows: ComputedRef<number>;
}

/**
 * The terminal's current dimensions, as refs that update on resize -- so a
 * component computing from the width in JS (a fixed number of columns per
 * item, a manually truncated string) re-renders when the terminal changes
 * size instead of keeping its mount-time value forever.
 *
 * What this reports is the size the layout was *actually computed at*, not a
 * live probe of the terminal (ink's `terminal-size`): arithmetic against a
 * width nothing was laid out at lands off by the difference. In
 * non-interactive mode nothing re-flows on resize, so this correctly stays at
 * its construction-time value rather than drifting away from the frame.
 *
 * Layouts expressed declaratively through flex props need none of this: Yoga
 * re-flows them on resize on its own.
 *
 * Must be called from a component mounted via `createApp().mount()`.
 */
export function useWindowSize(): UseWindowSizeResult {
  const { windowSize } = useStdoutContext();

  // Two computeds over one shared shallow ref rather than two refs, so a
  // resize that changes both dimensions triggers exactly one re-render.
  return {
    columns: computed(() => windowSize.value.columns),
    rows: computed(() => windowSize.value.rows),
  };
}
