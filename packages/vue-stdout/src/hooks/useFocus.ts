// Ported from ink's `src/hooks/use-focus.ts`. React re-invokes the whole hook
// per render, so ink recomputes `isFocused` as a plain boolean and lets
// dependency arrays react to `isActive`. Vue's `setup()` runs once, but the
// shared `FocusManager`'s state is itself reactive (`src/focus.ts`), so the
// equivalent is one `computed` derived from it -- no subscription, no
// teardown. The `watch` below is separate: it makes `isActive` reactive, as
// in `useInput`, so ink's `useInput(handler, { isActive: isFocused })` idiom
// works with what this hook returns.
import { type MaybeRefOrGetter, computed, onScopeDispose, toValue, watch } from 'vue';
import type { ComputedRef } from 'vue';
import { useFocusContext, useStdinContext } from '../context';

export interface UseFocusOptions {
  /**
   * Enable or disable this component's focus, while still maintaining its
   * position in the list of focusable components.
   *
   * Accepts a plain boolean, a `Ref<boolean>`, or a getter -- matching
   * `useInput`'s own `isActive` (`src/hooks/useInput.ts`), so toggling a
   * reactive value passed here genuinely activates/deactivates this
   * component's focus eligibility live.
   *
   * @default true
   */
  isActive?: MaybeRefOrGetter<boolean>;
  /** Auto-focus this component if there's no active (focused) component right now. */
  autoFocus?: boolean;
  /** Assign an ID to this component, so it can be programmatically focused with `focus(id)`. */
  id?: string;
}

export interface UseFocusResult {
  /**
   * Whether this component is focused. A ref, not a plain boolean -- pass it
   * straight into another `useInput`'s `isActive` option (ink's documented
   * `useInput(handler, { isActive: isFocused })` idiom) to let only the
   * currently focused widget handle input; a `ComputedRef<boolean>` still
   * satisfies `MaybeRefOrGetter<boolean>`.
   *
   * Read-only because it is *derived* from the shared `FocusManager`, not a
   * copy of it: writing to it would move no focus and would be reverted the
   * next time focus changed. Use {@link UseFocusResult.focus} instead.
   */
  readonly isFocused: ComputedRef<boolean>;
  /** Focuses a specific element with the provided `id`. */
  readonly focus: (id: string) => void;
}

let nextAutoId = 0;

/**
 * A component that calls `useFocus` becomes "focusable": pressing Tab moves
 * focus to it in the order these calls were made (mount order), and
 * Shift+Tab moves backward. If there are multiple, focus is given to them in
 * the order in which the components using this hook are rendered.
 *
 * Must be called from a component mounted via `createApp().mount()`.
 */
export function useFocus(options: UseFocusOptions = {}): UseFocusResult {
  const focusManager = useFocusContext('useFocus');
  const { setRawMode, isRawModeSupported } = useStdinContext();

  const id = options.id ?? `useFocus-${++nextAutoId}`;

  // Derived, not mirrored, so there is no ordering constraint against the
  // `add()` below: an `autoFocus` registration that moves focus here is
  // reflected the first time anything reads this.
  const isFocused = computed(() => focusManager.activeFocusId.value === id);

  focusManager.add(id, { autoFocus: options.autoFocus ?? false });

  let rawModeSubscribed = false;

  const stopWatch = watch(
    () => toValue(options.isActive) !== false,
    active => {
      if (active) {
        focusManager.activate(id);

        // Gated on `isRawModeSupported`, deliberately unlike `useInput`'s and
        // `usePaste`'s unconditional `setRawMode(true)` -- matching ink's own
        // `use-focus.js`. `setRawMode(true)` throws when unsupported (piped
        // `stdin`; see `InputSource#subscribe`), and becoming "focusable" is a
        // passive capability, not an explicit request to read raw keystrokes,
        // so it must not crash an app run with piped input.
        if (isRawModeSupported && !rawModeSubscribed) {
          rawModeSubscribed = true;
          setRawMode(true);
        }
      } else {
        focusManager.deactivate(id);

        if (rawModeSubscribed) {
          rawModeSubscribed = false;
          setRawMode(false);
        }
      }
    },
    // Runs synchronously, right here -- matching ink's own effect, so Tab
    // navigation works even for an app with no explicit `useInput` call.
    { immediate: true },
  );

  onScopeDispose(() => {
    stopWatch();

    if (rawModeSubscribed) {
      rawModeSubscribed = false;
      setRawMode(false);
    }

    // `remove()` moves focus off this id if it was the focused one (see
    // `src/focus.ts`). Nothing to unsubscribe afterwards: `isFocused` is a
    // `computed` over the manager's state, collected with this scope.
    focusManager.remove(id);
  });

  return {
    isFocused,
    focus: (targetId: string) => focusManager.focus(targetId),
  };
}
