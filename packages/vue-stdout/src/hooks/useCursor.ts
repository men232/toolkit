// Ported from ink's `src/hooks/use-cursor.ts`. ink stores the position in a
// `ref` during render and only propagates it from a `useInsertionEffect`,
// because a React function component can render more than once before
// committing and an abandoned concurrent render must not leak a stale cursor
// position; `useInsertionEffect` runs only for renders that actually commit.
//
// Vue's `setup()` runs exactly once and reactive updates re-invoke only the
// render function, synchronously -- there is no abandoned render to leak
// from, so that indirection has no counterpart here (the same conclusion
// `useInput.ts` reaches about `useEffectEvent`). This calls `CursorContext`
// directly: the last `setCursorPosition` wins, and the next
// `Container.onFrame`/`onStatic` picks it up.
import { type MaybeRefOrGetter, onScopeDispose, toValue, watch } from 'vue';
import { type CursorContextValue, useCursorContext } from '../context';
import type { CursorPosition } from '../cursorHelpers';

/**
 * Which `useCursor()` instance last wrote to each app's single cursor slot.
 *
 * `Container.cursorPosition` is one last-write-wins field, not a reference
 * count like raw mode or bracketed paste: "release" would have to *restore the
 * previous owner's position*, which a count cannot express. So ownership is
 * tracked instead -- only the consumer whose write is currently on screen
 * clears it on the way out, which stops the first component to unmount from
 * hiding a still-mounted sibling's cursor.
 *
 * Keyed weakly on the per-app context object, so nothing here outlives its app.
 */
const lastWriters = new WeakMap<CursorContextValue, symbol>();

export interface UseCursorResult {
  /**
   * Set the cursor position relative to the rendered output. Making a
   * position visible places the real terminal cursor there -- useful for
   * IME (Input Method Editor) support, where the composing character should
   * be displayed at the cursor location. Pass `undefined` to hide it.
   */
  setCursorPosition: (position: CursorPosition | undefined) => void;
}

/**
 * A hook that controls the terminal cursor position.
 * Must be called from a component mounted via `createApp().mount()`.
 *
 * Optionally takes a reactive `position` source -- a plain value, a `Ref`, or
 * a getter -- and owns the watcher that pushes it through, so a caret derived
 * from reactive state (the IME case this hook exists for) needs no
 * hand-written `watchEffect`. Same shape as `useFocus`/`useInput`'s `isActive`
 * option; driving {@link UseCursorResult.setCursorPosition} by hand instead
 * works too.
 *
 * Note the caveat `Container.setCursorPosition` documents: setting a position
 * does not itself schedule a frame, so one that changes while nothing else
 * re-renders is only picked up by the next frame something else causes. A
 * watcher here does not change that.
 *
 * There is deliberately no writable `cursorPosition` ref: `Container` owns a
 * single last-write-wins slot with a setter and no read path, so a ref would
 * be a local mirror reading back its own last write while the terminal shows
 * another consumer's.
 */
export function useCursor(
  position?: MaybeRefOrGetter<CursorPosition | undefined>,
): UseCursorResult {
  const context = useCursorContext();

  /** This instance's identity in {@link lastWriters}. */
  const token = Symbol('useCursor');

  const setCursorPosition = (position: CursorPosition | undefined): void => {
    lastWriters.set(context, token);
    context.setCursorPosition(position);
  };

  if (position !== undefined) {
    watch(() => toValue(position), setCursorPosition, {
      immediate: true,
      // After the patch that produced the content the position is relative
      // to, not during it.
      flush: 'post',
    });
  }

  // Matches ink: hide the cursor on unmount rather than leaving a stale
  // position pointing at content that is gone -- but only if this instance's
  // write is the one on screen. See {@link lastWriters}.
  onScopeDispose(() => {
    if (lastWriters.get(context) !== token) return;

    lastWriters.delete(context);
    context.setCursorPosition(undefined);
  });

  return { setCursorPosition };
}
