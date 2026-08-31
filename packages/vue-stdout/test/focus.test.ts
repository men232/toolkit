import { computed, watch } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { FocusManager } from '../src/focus';

/**
 * Subscribes to every piece of `manager`'s reactive state the way a consumer
 * composable does (`src/hooks/useFocus.ts`, `useFocusManager.ts`), and
 * returns a spy invoked once per observable change.
 *
 * This is the reactive-data equivalent of the `manager.on('change', spy)`
 * these tests used while `FocusManager` was an `EventEmitter`. The one
 * deliberate difference: a `'change'` emission was unconditional, whereas a
 * ref only notifies when its value actually *changed* -- so a mutation
 * method that wrote a field back to the value it already held used to notify
 * and now does not. That difference is invisible to every real consumer (all
 * of them derive from the value, not from the notification), and the
 * "notifies nobody" tests below pair each absence assertion with a positive
 * control so an absence can never be mistaken for a dead subscription.
 */
function observe(manager: FocusManager) {
  const snapshot = computed(
    () => `${manager.size}|${manager.activeFocusId.value}|${manager.isFocusEnabled.value}`,
  );
  const onChange = vi.fn();

  watch(snapshot, onChange, { flush: 'sync' });

  return onChange;
}

describe('FocusManager', () => {
  it('registers in mount (registration) order and notifies observers per mutation', () => {
    const manager = new FocusManager();
    const onChange = observe(manager);

    manager.add('c', { autoFocus: false });
    manager.add('a', { autoFocus: false });
    manager.add('b', { autoFocus: false });

    expect(onChange).toHaveBeenCalledTimes(3);

    // Traversal order follows registration order, not id/alphabetical order --
    // whichever order components mounted (called `add`) in is the tab order.
    manager.focusNext();
    expect(manager.activeFocusId.value).toBe('c');
    manager.focusNext();
    expect(manager.activeFocusId.value).toBe('a');
    manager.focusNext();
    expect(manager.activeFocusId.value).toBe('b');
  });

  it('a duplicate id is ignored rather than creating a second entry', () => {
    const manager = new FocusManager();
    manager.add('x', { autoFocus: false });
    manager.add('y', { autoFocus: false });
    manager.add('x', { autoFocus: false });

    expect(manager.size).toBe(2);
  });

  it('autoFocus focuses the first-registered component with it set, and only if nothing is focused yet', () => {
    const manager = new FocusManager();
    manager.add('a', { autoFocus: false });
    manager.add('b', { autoFocus: true });
    expect(manager.activeFocusId.value).toBe('b');

    // A later autoFocus registration does not steal focus away.
    manager.add('c', { autoFocus: true });
    expect(manager.activeFocusId.value).toBe('b');
  });

  describe('focusNext / focusPrevious', () => {
    it('wraps forward from the last focusable back to the first', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.add('c', { autoFocus: false });

      manager.focus('c');
      manager.focusNext();
      expect(manager.activeFocusId.value).toBe('a');
    });

    it('wraps backward from the first focusable back to the last', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.add('c', { autoFocus: false });

      manager.focus('a');
      manager.focusPrevious();
      expect(manager.activeFocusId.value).toBe('c');
    });

    it('focusNext with nothing focused yet lands on the first focusable', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });

      manager.focusNext();
      expect(manager.activeFocusId.value).toBe('a');
    });

    it('focusPrevious with nothing focused yet lands on the last focusable', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });

      manager.focusPrevious();
      expect(manager.activeFocusId.value).toBe('b');
    });

    it('skips deactivated entries while traversing', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.add('c', { autoFocus: false });
      manager.deactivate('b');

      manager.focus('a');
      manager.focusNext();
      expect(manager.activeFocusId.value).toBe('c');
    });
  });

  describe('unmounting the focused component', () => {
    it('moves focus to the next eligible component, not to nothing', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.add('c', { autoFocus: false });

      manager.focus('b');
      manager.remove('b');

      // "somewhere sensible": the component that took b's place in the list.
      expect(manager.activeFocusId.value).toBe('c');
    });

    it('wraps to the first eligible component when the focused (and removed) one was last', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.add('c', { autoFocus: false });

      manager.focus('c');
      manager.remove('c');

      expect(manager.activeFocusId.value).toBe('a');
    });

    it('leaves focus at undefined when the only focusable component unmounts', () => {
      const manager = new FocusManager();
      manager.add('only', { autoFocus: false });
      manager.focus('only');

      manager.remove('only');

      expect(manager.activeFocusId.value).toBeUndefined();
      expect(manager.size).toBe(0);
    });

    it('removing a component that is not focused leaves activeFocusId untouched', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.focus('a');

      manager.remove('b');

      expect(manager.activeFocusId.value).toBe('a');
    });

    it('removing an unknown id is a no-op', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.focus('a');

      expect(() => manager.remove('nope')).not.toThrow();
      expect(manager.activeFocusId.value).toBe('a');
      expect(manager.size).toBe(1);
    });
  });

  describe('a focused component whose isActive goes false', () => {
    it('moves focus to the next eligible component instead of leaving nothing focused', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.focus('a');

      manager.deactivate('a');

      expect(manager.activeFocusId.value).toBe('b');
      // The deactivated entry is still registered (still in the tab order),
      // just not eligible to hold focus until reactivated.
      expect(manager.size).toBe(2);
    });

    it('reactivating restores eligibility but does not itself steal focus back', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.focus('a');
      manager.deactivate('a');
      expect(manager.activeFocusId.value).toBe('b');

      manager.activate('a');
      expect(manager.activeFocusId.value).toBe('b');

      // But it's focusable again via traversal/direct focus.
      manager.focus('a');
      expect(manager.activeFocusId.value).toBe('a');
    });

    it('deactivating a component that is not focused leaves activeFocusId untouched', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.focus('a');

      manager.deactivate('b');

      expect(manager.activeFocusId.value).toBe('a');
    });
  });

  describe('focus(id)', () => {
    it('focusing an id that does not exist leaves focus unchanged', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.focus('a');

      manager.focus('does-not-exist');

      expect(manager.activeFocusId.value).toBe('a');
    });

    it('focusing an id that does not exist notifies no observer', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      const onChange = observe(manager);

      manager.focus('does-not-exist');

      expect(onChange).not.toHaveBeenCalled();

      // Positive control: the subscription above is genuinely live, so the
      // assertion just made is an absence of *notification*, not an absence
      // of subscription.
      manager.focus('a');
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('isFocusEnabled', () => {
    it('is a writable ref, true by default, and notifies observers on change', () => {
      const manager = new FocusManager();
      const onChange = observe(manager);

      expect(manager.isFocusEnabled.value).toBe(true);

      manager.isFocusEnabled.value = false;
      expect(manager.isFocusEnabled.value).toBe(false);
      expect(onChange).toHaveBeenCalledTimes(1);

      manager.isFocusEnabled.value = true;
      expect(manager.isFocusEnabled.value).toBe(true);
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    // Preserves what the old `enableFocus()`/`disableFocus()` early-return
    // guards bought: setting the flag to the value it already holds is a
    // no-op that notifies nobody. The guards are gone; a ref's own
    // `hasChanged` check is what enforces this now.
    it('writing the value it already holds notifies nobody', () => {
      const manager = new FocusManager();
      const onChange = observe(manager);

      manager.isFocusEnabled.value = true;
      expect(onChange).not.toHaveBeenCalled();

      // Positive control, as above.
      manager.isFocusEnabled.value = false;
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearFocus', () => {
    it('clears the currently focused component to undefined, unlike remove()/deactivate()', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      manager.add('b', { autoFocus: false });
      manager.focus('a');
      expect(manager.activeFocusId.value).toBe('a');

      // Deliberately unlike `remove()`/`deactivate()`, which move focus to
      // the next eligible component instead -- this is a user-invoked "give
      // up focus" gesture (Escape), not a component involuntarily leaving.
      manager.clearFocus();
      expect(manager.activeFocusId.value).toBeUndefined();

      // The component itself is still registered -- a subsequent Tab press
      // still reaches it, starting from the top.
      expect(manager.size).toBe(2);
    });

    it('is a no-op (notifies no observer) when nothing is focused', () => {
      const manager = new FocusManager();
      manager.add('a', { autoFocus: false });
      const onChange = observe(manager);

      manager.clearFocus();

      expect(manager.activeFocusId.value).toBeUndefined();
      expect(onChange).not.toHaveBeenCalled();

      // Positive control: the subscription above is genuinely live.
      manager.focus('a');
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });
});
