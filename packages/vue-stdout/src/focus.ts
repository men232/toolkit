// Ported from the focus-management slice of ink's `src/components/App.tsx`
// plus the shape of `src/components/FocusContext.ts`. ink keeps this as
// component state inside its single root `<App>`; this project has no
// equivalent -- the root is whatever component `createApp()` was given -- so
// it is a plain class instead: one registry per mount, created alongside that
// mount's `Container` and holding the tab order and the focused id for as
// long as it lives. Every registration is removed by its own `useFocus`
// disposer when the tree unmounts, so the registry owns no resource that
// outlives the mount.
//
// Imported from `@vue/runtime-core` rather than `vue` for the same reason
// `src/createApp.ts` and `src/vueRenderer.ts` are: that is this package's own
// hard `dependency`, while `vue` is a peer the *consumer* supplies. (`src/hooks/**`
// import from `vue` -- they only run inside the consumer's tree, where the
// peer is present by definition.)
import { readonly, shallowReactive, shallowRef } from '@vue/runtime-core';
import type { Ref } from '@vue/runtime-core';

export interface AddFocusableOptions {
  readonly autoFocus: boolean;
}

interface FocusableEntry {
  readonly id: string;
  /**
   * Whether this entry is currently eligible to *become* focused --
   * `useFocus`'s `isActive` option (default `true`). Not to be confused with
   * {@link FocusManager.activeFocusId}, which is the one entry that
   * currently *is* focused.
   * ink names both "active"; kept distinct here on purpose.
   */
  enabled: boolean;
}

/**
 * Registry of focusable components plus whichever one is currently focused.
 * Matches ink's `FocusContext.Props` one-for-one on the public methods, with
 * one deliberate behavioural difference (see {@link remove}).
 *
 * The state is reactive data, so `useFocus`/`useFocusManager` *derive* from it
 * with a `computed` instead of mirroring it into their own refs -- no
 * subscription, no teardown, no hand-written sync for every mutation to
 * remember. (ink re-runs each hook per render and so recomputes `isFocused` as
 * a plain boolean instead.)
 *
 * `shallowReactive` rather than `reactive`: nothing observes an entry's
 * `enabled` flag on its own -- a flip that matters at all moves focus, which
 * changes `activeFocusId` anyway (see {@link deactivate}) -- so a deep proxy
 * per entry would buy nothing.
 */
export class FocusManager {
  private readonly focusables = shallowReactive<FocusableEntry[]>([]);
  private readonly currentId = shallowRef<string | undefined>(undefined);

  /**
   * The id of the currently focused component, or `undefined` if none is.
   *
   * Read-only on purpose: {@link focus} is documented to no-op for an id
   * that is not registered, so a writable ref here would silently reject
   * such a write and read back the old value. The method is the write path.
   */
  readonly activeFocusId: Readonly<Ref<string | undefined>> = readonly(this.currentId);

  /**
   * Whether focus management (and Tab/Shift+Tab navigation) is enabled.
   *
   * Matches ink's `App.tsx`: this flips the flag only. The currently focused
   * component keeps its focus while disabled -- what stops is Tab/Shift+Tab
   * navigation and Escape-to-clear (`src/createApp.ts`).
   */
  readonly isFocusEnabled: Ref<boolean> = shallowRef(true);

  /** Number of components currently registered, regardless of `enabled`. */
  get size(): number {
    return this.focusables.length;
  }

  /**
   * Registers a focusable component. A duplicate `id` is ignored rather than
   * creating a second entry -- ink needs no such guard (its ids are near-always
   * `Math.random()`-generated), but a caller-supplied `id` can collide, and two
   * entries answering to the same id in `focus(id)` is worse.
   */
  add(id: string, { autoFocus }: AddFocusableOptions): void {
    if (this.focusables.some(entry => entry.id === id)) return;

    this.focusables.push({ id, enabled: true });

    if (autoFocus && this.currentId.value === undefined) {
      this.currentId.value = id;
    }
  }

  /**
   * Unregisters a focusable component -- called from `useFocus`'s teardown
   * when the component unmounts.
   *
   * Deliberately diverges from ink: ink's `removeFocusable` clears `activeId`
   * to `undefined` when the focused component goes away, so every keystroke
   * silently goes nowhere until the user next presses Tab. Here focus instead
   * moves to the next enabled component in tab order from the removed
   * position, wrapping around.
   */
  remove(id: string): void {
    const index = this.focusables.findIndex(entry => entry.id === id);
    if (index === -1) return;

    const wasActive = this.currentId.value === id;
    this.focusables.splice(index, 1);

    if (wasActive) {
      this.currentId.value = this.findNextEligibleFrom(index);
    }
  }

  /** Re-enables a component previously deactivated via {@link deactivate}. */
  activate(id: string): void {
    const entry = this.focusables.find(candidate => candidate.id === id);
    if (!entry || entry.enabled) return;

    entry.enabled = true;
  }

  /**
   * Marks a component ineligible to hold focus (`useFocus`'s `isActive:
   * false`), without removing it from the tab order. For the same reason as
   * {@link remove}: if this was the focused component, focus moves to the
   * next eligible one instead of vanishing.
   */
  deactivate(id: string): void {
    const index = this.focusables.findIndex(candidate => candidate.id === id);
    if (index === -1) return;

    const entry = this.focusables[index]!;
    if (!entry.enabled) return;

    entry.enabled = false;

    if (this.currentId.value === id) {
      this.currentId.value = this.findNextEligibleFrom(index);
    }
  }

  /**
   * Focuses the component with the given `id`. Matches ink: if no component
   * with that id is currently registered, this is a no-op -- focus stays
   * exactly where it was.
   */
  focus(id: string): void {
    if (!this.focusables.some(entry => entry.id === id)) return;

    this.currentId.value = id;
  }

  /**
   * Clears focus entirely, matching ink's Escape-key behaviour. Deliberately
   * unlike {@link remove}/{@link deactivate}, which move focus onward because
   * a component involuntarily *left*: this is a user-invoked "give up focus"
   * gesture, so it goes all the way to `undefined` and the next Tab press
   * starts from the top again, same as ink.
   */
  clearFocus(): void {
    if (this.currentId.value === undefined) return;

    this.currentId.value = undefined;
  }

  /**
   * Focuses the next eligible component after the current one, wrapping to
   * the first eligible component past the end of the list. If nothing is
   * currently focused, focuses the first eligible component.
   */
  focusNext(): void {
    const activeIndex = this.focusables.findIndex(entry => entry.id === this.currentId.value);
    const firstEligibleId = this.focusables.find(entry => entry.enabled)?.id;

    let nextId: string | undefined;
    for (let index = activeIndex + 1; index < this.focusables.length; index++) {
      const candidate = this.focusables[index]!;
      if (candidate.enabled) {
        nextId = candidate.id;
        break;
      }
    }

    this.currentId.value = nextId ?? firstEligibleId;
  }

  /**
   * Focuses the previous eligible component before the current one, wrapping
   * to the last eligible component before the start of the list. If nothing
   * is currently focused, focuses the last eligible component.
   */
  focusPrevious(): void {
    const activeIndex = this.focusables.findIndex(entry => entry.id === this.currentId.value);
    let lastEligibleId: string | undefined;
    for (let index = this.focusables.length - 1; index >= 0; index--) {
      const candidate = this.focusables[index]!;
      if (candidate.enabled) {
        lastEligibleId = candidate.id;
        break;
      }
    }

    let previousId: string | undefined;
    for (let index = activeIndex - 1; index >= 0; index--) {
      const candidate = this.focusables[index]!;
      if (candidate.enabled) {
        previousId = candidate.id;
        break;
      }
    }

    this.currentId.value = previousId ?? lastEligibleId;
  }

  /**
   * First eligible entry scanning forward from `index` (inclusive, so a
   * still-present-but-just-disabled entry at `index` is correctly skipped)
   * then wrapping to the start; `undefined` if none exists. Shared by
   * {@link remove} and {@link deactivate}, the two places focus has to move
   * off a component that can no longer hold it.
   */
  private findNextEligibleFrom(index: number): string | undefined {
    for (let i = index; i < this.focusables.length; i++) {
      const candidate = this.focusables[i]!;
      if (candidate.enabled) return candidate.id;
    }

    for (let i = 0; i < index && i < this.focusables.length; i++) {
      const candidate = this.focusables[i]!;
      if (candidate.enabled) return candidate.id;
    }

    return undefined;
  }
}
