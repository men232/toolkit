import { defineComponent, h, nextTick, ref } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useFocus } from '../src/hooks/useFocus';
import { useFocusManager } from '../src/hooks/useFocusManager';
import { useInput } from '../src/hooks/useInput';
import { createStdin, emitReadable } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const TAB = '\t';
const SHIFT_TAB = '[Z';
const ESCAPE = '\u001B';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Reactive state (`isFocused`, an `isActive` ref going false, mounting or
 * unmounting a child) only reaches the terminal after Vue's own render
 * effect flushes (`nextTick()`) and this project's own renderer -- scheduled
 * off the resulting `DOMChanged` event via `process.nextTick`
 * (`src/tree/render.ts`) -- runs its layout+paint pass. Matches the two-step
 * settle `test/progress-bar.test.tsx` uses for the same reason.
 */
async function settle(): Promise<void> {
  await nextTick();
  await flush();
}

/**
 * A focusable leaf: registers via `useFocus(options)` and renders `[id]`
 * while focused, or bare `id` otherwise -- so the test can read every
 * child's focus state straight off the painted frame.
 *
 * Memoized per `id` (reset in `beforeEach` below): several tests read a ref
 * directly inside the *root* component's render function (e.g. `showB.value
 * ? h(Focusable('b')) : null`), which re-runs that render function on every
 * change. Calling `defineComponent(...)` fresh each time would hand Vue a
 * brand-new component *type* on every re-render, forcing every sibling to
 * unmount and remount too -- not the targeted single unmount these tests
 * mean to exercise. Returning the same component object for the same `id`
 * keeps Vue's patch a same-app update for anyone not actually
 * conditionally removed.
 */
let focusableCache = new Map<string, ReturnType<typeof defineComponent>>();

beforeEach(() => {
  focusableCache = new Map();
});

function Focusable(id: string, options: Record<string, unknown> = {}) {
  let component = focusableCache.get(id);

  if (!component) {
    component = defineComponent({
      setup() {
        const { isFocused } = useFocus({ id, ...options });
        return () => h('stdout-text', {}, isFocused.value ? `[${id}]` : id);
      },
    });
    focusableCache.set(id, component);
  }

  return component;
}

function mountFocusApp(children: ReturnType<typeof h>[]) {
  const stdin = createStdin();
  const stdout = createStdout(20);

  // `maxFps: 0` (unlimited): every test in this file
  // asserts on the frame immediately after a single `settle()`, several of
  // them back to back with no real time elapsed between assertions -- the
  // default `maxFps: 30` throttle would coalesce those into one write and
  // strand these tests looking at a stale, pre-Tab/Escape frame.
  const app = createApp({ setup: () => () => h('stdout-box', {}, children) });
  app.mount({ stdin, stdout, maxFps: 0 });

  return { app, stdin, stdout };
}

describe('useFocus', () => {
  it('registers focusables in mount order; Tab cycles through them in that order', async () => {
    const { stdin, stdout } = mountFocusApp([h(Focusable('a')), h(Focusable('b')), h(Focusable('c'))]);

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[a]');

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[b]');

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[c]');

    // Wraps back to the first.
    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[a]');
  });

  it('Shift+Tab moves backward and wraps at the start', async () => {
    const { stdin, stdout } = mountFocusApp([h(Focusable('a')), h(Focusable('b')), h(Focusable('c'))]);

    emitReadable(stdin, TAB); // -> a
    await settle();

    emitReadable(stdin, SHIFT_TAB);
    await settle();
    // Nothing precedes a, so this wraps to the last eligible: c.
    expect(stdout.get()).toContain('[c]');

    emitReadable(stdin, SHIFT_TAB);
    await settle();
    expect(stdout.get()).toContain('[b]');
  });

  it('Escape clears focus entirely, matching ink (App.tsx:156) -- not to the next eligible component', async () => {
    // A lone Escape byte is ambiguous on its own (it could be the start of a
    // longer CSI sequence still arriving), so `InputSource` holds it pending
    // for `pendingFlushDelayMs` (20ms, a real `setTimeout`) before flushing it
    // as literal input -- same mechanism `test/input-source.test.ts`'s "lone
    // pending escape" test exercises. Fake timers control only that
    // `setTimeout`; `process.nextTick`/`nextTick()` (what `settle()` uses)
    // are untouched by `vi.useFakeTimers()`'s default fake list, so the
    // render pipeline itself still settles normally.
    vi.useFakeTimers();
    try {
      const { stdin, stdout } = mountFocusApp([h(Focusable('a')), h(Focusable('b'))]);

      emitReadable(stdin, TAB); // -> a
      await settle();
      expect(stdout.get()).toContain('[a]');

      emitReadable(stdin, ESCAPE);
      vi.advanceTimersByTime(20);
      await settle();
      // Neither `a` nor `b` is focused -- unlike `remove()`/`deactivate()`,
      // Escape does not move focus to the next eligible component.
      expect(stdout.get()).not.toContain('[a]');
      expect(stdout.get()).not.toContain('[b]');
      expect(stdout.get()).toContain('a');
      expect(stdout.get()).toContain('b');

      // Tab still works afterwards, starting from the top.
      emitReadable(stdin, TAB);
      await settle();
      expect(stdout.get()).toContain('[a]');
    } finally {
      vi.useRealTimers();
    }
  });

  it('unmounting the focused component moves focus elsewhere, not to nothing', async () => {
    const showB = ref(true);
    const stdin = createStdin();
    const stdout = createStdout(20);

    // `maxFps: 0` (unlimited) -- see `mountFocusApp`'s own comment; this test
    // predates the default throttle and asserts on the frame right after
    // each `settle()`.
    const app = createApp({
      setup: () => () =>
        h('stdout-box', {}, [h(Focusable('a')), showB.value ? h(Focusable('b')) : null, h(Focusable('c'))]),
    });
    app.mount({ stdin, stdout, maxFps: 0 });

    emitReadable(stdin, TAB); // -> a
    await settle();
    emitReadable(stdin, TAB); // -> b
    await settle();
    expect(stdout.get()).toContain('[b]');

    showB.value = false;
    await settle();

    // b is gone, and something is still focused -- not silence.
    expect(stdout.get()).toContain('[c]');
    expect(stdout.get()).not.toContain('[b]');

    app.unmount();
  });

  it('unmounting the only focused component leaves nothing focused, without throwing', async () => {
    const showOnly = ref(true);
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    // `maxFps: 0` -- see `mountFocusApp`'s own comment.
    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [showOnly.value ? h(Focusable('only')) : h('stdout-text', {}, 'gone')]);
      },
    });
    app.mount({ stdin, stdout, maxFps: 0 });

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[only]');

    expect(() => {
      showOnly.value = false;
    }).not.toThrow();
    await settle();

    expect(stdout.get()).toContain('gone');
    expect(manager!.activeId.value).toBeUndefined();

    app.unmount();
  });

  it('a focused component whose isActive goes false loses focus to another eligible component', async () => {
    const isActive = ref(true);
    const stdin = createStdin();
    const stdout = createStdout(20);

    // `maxFps: 0` -- see `mountFocusApp`'s own comment.
    const app = createApp({
      setup: () => () => h('stdout-box', {}, [h(Focusable('a', { isActive })), h(Focusable('b'))]),
    });
    app.mount({ stdin, stdout, maxFps: 0 });

    emitReadable(stdin, TAB); // -> a
    await settle();
    expect(stdout.get()).toContain('[a]');

    isActive.value = false;
    await settle();

    expect(stdout.get()).toContain('[b]');
    expect(stdout.get()).not.toContain('[a]');

    app.unmount();
  });

  it('autoFocus focuses a component on mount when nothing else is focused', async () => {
    const { stdout } = mountFocusApp([h(Focusable('a', { autoFocus: true }))]);
    await settle();
    expect(stdout.get()).toContain('[a]');
  });

  it('puts stdin into raw mode while mounted, and releases it on unmount (reference-counted)', async () => {
    const { app, stdin } = mountFocusApp([h(Focusable('a'))]);

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    app.unmount();
    await flush();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it("isFocused can be passed straight into another useInput's isActive", async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    const ChildA = defineComponent({
      setup() {
        const { isFocused } = useFocus({ id: 'a' });
        useInput(handlerA, { isActive: isFocused });
        return () => h('stdout-text', {}, 'a');
      },
    });

    const ChildB = defineComponent({
      setup() {
        const { isFocused } = useFocus({ id: 'b' });
        useInput(handlerB, { isActive: isFocused });
        return () => h('stdout-text', {}, 'b');
      },
    });

    const app = createApp(
      { setup: () => () => h('stdout-box', {}, [h(ChildA), h(ChildB)]) },
    );
    app.mount({ stdin, stdout });

    // Nothing focused yet -- neither handler is active.
    emitReadable(stdin, 'x');
    expect(handlerA).not.toHaveBeenCalled();
    expect(handlerB).not.toHaveBeenCalled();

    emitReadable(stdin, TAB); // focuses a
    await settle();
    emitReadable(stdin, 'x');
    expect(handlerA).toHaveBeenCalledExactlyOnceWith('x', expect.anything());
    expect(handlerB).not.toHaveBeenCalled();

    // The Tab keystroke that moves focus from a to b is itself delivered to
    // handlerA too (isActive's watch -- like ink's own use-input effect --
    // unsubscribes on the *next* reactive flush, not synchronously within
    // this same dispatch, so the outgoing handler still sees the very
    // keystroke that defocuses it). Real, ink-faithful, and harmless: clear
    // it here and assert on the keystroke *after* settling instead, which is
    // the case this test is actually about.
    handlerA.mockClear();
    emitReadable(stdin, TAB); // focuses b
    await settle();
    handlerA.mockClear();

    emitReadable(stdin, 'y');
    expect(handlerB).toHaveBeenCalledExactlyOnceWith('y', expect.anything());
    expect(handlerA).not.toHaveBeenCalled();

    app.unmount();
  });
});

describe('useFocusManager', () => {
  it('focus(id) focuses a known id directly, without waiting for Tab', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [h(Focusable('a')), h(Focusable('b'))]);
      },
    });
    app.mount({ stdin, stdout });

    manager!.focus('b');
    await settle();

    expect(stdout.get()).toContain('[b]');
    expect(manager!.activeId.value).toBe('b');

    app.unmount();
  });

  it('focus(id) for an id that does not exist leaves focus unchanged', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [h(Focusable('a')), h(Focusable('b'))]);
      },
    });
    app.mount({ stdin, stdout });

    manager!.focus('a');
    await settle();
    expect(stdout.get()).toContain('[a]');

    expect(() => manager!.focus('does-not-exist')).not.toThrow();
    await settle();
    expect(stdout.get()).toContain('[a]');
    expect(manager!.activeId.value).toBe('a');

    app.unmount();
  });

  it('focusNext()/focusPrevious() drive the same registry Tab/Shift+Tab use', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [h(Focusable('a')), h(Focusable('b')), h(Focusable('c'))]);
      },
    });
    app.mount({ stdin, stdout });

    manager!.focusNext();
    await settle();
    expect(manager!.activeId.value).toBe('a');
    expect(stdout.get()).toContain('[a]');

    manager!.focusNext();
    await settle();
    expect(manager!.activeId.value).toBe('b');

    manager!.focusPrevious();
    await settle();
    expect(manager!.activeId.value).toBe('a');

    app.unmount();
  });

  it('isFocusEnabled.value = false stops Tab from doing anything; true restores it', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    // `maxFps: 0` -- see `mountFocusApp`'s own comment.
    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [h(Focusable('a')), h(Focusable('b'))]);
      },
    });
    app.mount({ stdin, stdout, maxFps: 0 });

    manager!.isFocusEnabled.value = false;
    await settle();

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).not.toContain('[a]');
    expect(stdout.get()).not.toContain('[b]');

    manager!.isFocusEnabled.value = true;
    await settle();

    emitReadable(stdin, TAB);
    await settle();
    expect(stdout.get()).toContain('[a]');

    app.unmount();
  });

  // `isFocusEnabled` was write-only before (two imperative setters,
  // `enableFocus()`/`disableFocus()`, and no reader at all), so a component
  // could not render "focus: on/off" or bind a toggle to it. Reading it, and
  // reading it *reactively* from a component's render function, is the new
  // half of the API this test exists to pin down.
  it('isFocusEnabled is readable, and a component rendering it re-renders when it changes', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    // `maxFps: 0` -- see `mountFocusApp`'s own comment.
    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-text', {}, `focus:${manager!.isFocusEnabled.value ? 'on' : 'off'}`);
      },
    });
    app.mount({ stdin, stdout, maxFps: 0 });

    await settle();
    expect(manager!.isFocusEnabled.value).toBe(true);
    expect(stdout.get()).toContain('focus:on');

    manager!.isFocusEnabled.value = false;
    await settle();
    expect(manager!.isFocusEnabled.value).toBe(false);
    expect(stdout.get()).toContain('focus:off');

    app.unmount();
  });

  it('activeId reflects the currently focused id reactively, including undefined when nothing is focused', async () => {
    const stdin = createStdin();
    const stdout = createStdout(20);
    let manager: ReturnType<typeof useFocusManager> | undefined;

    const app = createApp({
      setup: () => {
        manager = useFocusManager();
        return () => h('stdout-box', {}, [h(Focusable('only'))]);
      },
    });
    app.mount({ stdin, stdout });

    expect(manager!.activeId.value).toBeUndefined();

    emitReadable(stdin, TAB);
    await settle();
    expect(manager!.activeId.value).toBe('only');

    app.unmount();
  });
});

describe('FocusManager listener-free mounting', () => {
  // Each mounted `useFocus()` used to attach its own `'change'` listener to
  // the one shared `FocusManager`, which was an `EventEmitter`. Past
  // `EventEmitter`'s default cap of 10, Node calls `process.emitWarning`,
  // whose default handler prints straight to `process.stderr` -- mid-frame,
  // in a raw-mode TUI, this garbles whatever is currently on screen (the
  // exact failure this package has already recorded once, from an unrelated
  // warning). A scrollable list of eleven-plus focusable rows is an entirely
  // ordinary UI, not a contrived edge case -- hence 15 rows below,
  // comfortably past the default cap of 10.
  //
  // `FocusManager` is reactive data now (`src/focus.ts`) and `useFocus`
  // derives `isFocused` from it with a `computed`, so there is no
  // subscription per consumer to overflow any cap. This test stays as the
  // regression guard on that: it fails again the moment mounting a pile of
  // focusables starts attaching a listener each. See the sibling test in
  // `test/use-input.test.ts` for `InputSource`, which genuinely does take
  // one listener per `useInput` consumer and needs its `setMaxListeners(0)`.
  //
  // `process.emitWarning` defers the actual `'warning'` emission (and so the
  // default stderr print) to a later tick, so this listens for the event
  // directly rather than asserting on a *lack* of a stderr write -- a
  // stronger, more direct check than trying to catch an absence after some
  // fixed number of ticks.
  it('mounting 15 focusable rows does not emit a MaxListenersExceededWarning', async () => {
    const warnings: string[] = [];
    const onWarning = (warning: Error) => {
      warnings.push(warning.name);
    };
    process.on('warning', onWarning);

    try {
      const rows = Array.from({ length: 15 }, (_, index) => h(Focusable(`row-${index}`)));
      const { app } = mountFocusApp(rows);

      // Give any deferred `process.emitWarning` a chance to actually surface
      // as a `'warning'` event before asserting its absence.
      await flush();
      await flush();

      expect(warnings).not.toContain('MaxListenersExceededWarning');

      app.unmount();
    } finally {
      process.off('warning', onWarning);
    }
  });

  it('does not throw when stdin cannot be put into raw mode, unlike useInput/usePaste', () => {
    // `useFocus` gates its own `setRawMode(true)` call on `isRawModeSupported`
    // (matching ink's own `use-focus.js`) precisely so a non-TTY `stdin`
    // (piped/redirected input) does not crash an app that merely renders a
    // focusable component -- unlike `useInput`/`usePaste`, which call
    // `setRawMode(true)` unconditionally and so do throw for the same
    // `stdin` (see their own tests of this same name).
    const stdin = createStdin(false);
    const stdout = createStdout(20);

    expect(() =>
      createApp({ setup: () => () => h(Focusable('solo')) }).mount({
        stdin,
        stdout,
      }),
    ).not.toThrow();
  });
});
