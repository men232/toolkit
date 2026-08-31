// Ported from ink's `src/hooks/use-focus-manager.ts` /
// `src/components/FocusContext.ts`. ink recomputes its state each render;
// here it is the shared `FocusManager`'s own refs (`src/focus.ts`) handed
// straight through, so this composable is a plain view onto reactive data
// with no subscription, mirror ref or teardown of its own.
import type { Ref } from 'vue';
import { useFocusContext } from '../context';

export interface UseFocusManagerResult {
  /**
   * Whether focus management (and Tab/Shift+Tab navigation) is enabled, for
   * all components. Readable as well as writable, so a component can render
   * the current mode or bind a toggle straight to it; replaces ink's
   * `enableFocus()`/`disableFocus()` pair.
   *
   * Matches ink: disabling flips the flag only, it does not clear the
   * currently focused component. What stops while disabled is Tab/Shift+Tab
   * navigation and Escape-to-clear.
   */
  readonly isFocusEnabled: Ref<boolean>;
  /**
   * Switch focus to the next focusable component. If there's no active
   * component right now, focus is given to the first focusable component.
   * Wraps to the first focusable component if the active one is last.
   */
  readonly focusNext: () => void;
  /**
   * Switch focus to the previous focusable component. If there's no active
   * component right now, focus is given to the last focusable component.
   * Wraps to the last focusable component if the active one is first.
   *
   * (ink's own docs say "first" here, but its implementation is
   * `previousFocusableId ?? lastFocusableId` -- last, same as this. The
   * behaviour matches; only ink's wording is wrong.)
   */
  readonly focusPrevious: () => void;
  /**
   * Switch focus to the element with the provided `id`. If there's no
   * element with that `id`, focus is not changed.
   */
  readonly focus: (id: string) => void;
  /**
   * The ID of the currently focused component, or `undefined` if none is.
   *
   * Read-only: because {@link UseFocusManagerResult.focus} no-ops for an
   * unregistered id, a writable ref here would silently reject such a write
   * and read back the old value. `focus(id)` is the write path.
   */
  readonly activeId: Readonly<Ref<string | undefined>>;
}

/**
 * Returns the shared focus state -- which component is focused, and whether
 * focus management is enabled at all -- plus methods to move focus to the
 * next/previous/a specific component.
 * Must be called from a component mounted via `createApp().mount()`.
 */
export function useFocusManager(): UseFocusManagerResult {
  const focusManager = useFocusContext('useFocusManager');

  return {
    isFocusEnabled: focusManager.isFocusEnabled,
    focusNext: () => focusManager.focusNext(),
    focusPrevious: () => focusManager.focusPrevious(),
    focus: (id: string) => focusManager.focus(id),
    activeId: focusManager.activeFocusId,
  };
}
