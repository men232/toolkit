import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useInput } from '../src/hooks/useInput';
import type { InputHandler, UseInputOptions } from '../src/hooks/useInput';
import { createStdin, emitReadable } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Mounts a component that calls `useInput(handler, options)` from its own
 * `setup()`, wired to a fake stdin/stdout (`test/helpers/create-stdin.ts`,
 * `create-stdout.ts`) -- never the real `process.stdin`. The suite-wide
 * tripwire (`test/setup/no-real-raw-mode.ts`) would fail this whole run the
 * instant that boundary were crossed.
 */
function mountWithInput(handler: InputHandler, options?: UseInputOptions) {
  const stdin = createStdin();
  const stdout = createStdout(20);

  const app = createApp({
    setup() {
      useInput(handler, options);
      return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
    },
  });
  app.mount({ stdin, stdout });

  return { app, stdin, stdout };
}

describe('useInput', () => {
  it('receives a plain key as input, with every modifier false', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    emitReadable(stdin, 'a');

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      'a',
      expect.objectContaining({ ctrl: false, meta: false, shift: false }),
    );

    app.unmount();
  });

  it('reports arrow keys via `key`, with input suppressed to an empty string', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    emitReadable(stdin, '\u001B[A'); // up arrow

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      '',
      expect.objectContaining({ upArrow: true, downArrow: false }),
    );

    app.unmount();
  });

  it('reports ctrl+letter both as `key.ctrl` and as the bare letter in `input`', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    emitReadable(stdin, '\u0004'); // Ctrl+D

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      'd',
      expect.objectContaining({ ctrl: true }),
    );

    app.unmount();
  });

  it('skips the handler for Ctrl+C when exitOnCtrlC is the default (true)', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    emitReadable(stdin, '\u0003'); // Ctrl+C

    expect(handler).not.toHaveBeenCalled();

    app.unmount();
  });

  it('does not skip Ctrl+C when the container was constructed with exitOnCtrlC: false', () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        useInput(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout, exitOnCtrlC: false });

    emitReadable(stdin, '\u0003');

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      'c',
      expect.objectContaining({ ctrl: true }),
    );

    app.unmount();
  });

  it('does not receive input, and never enables raw mode, when isActive is false', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler, { isActive: false });

    expect(stdin.setRawMode).not.toHaveBeenCalled();

    emitReadable(stdin, 'a');

    expect(handler).not.toHaveBeenCalled();

    app.unmount();
  });

  it('enables raw mode for the first subscriber on mount', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    app.unmount();
  });

  it('unsubscribes on unmount: raw mode turns off and further input is ignored', async () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    app.unmount();
    await flush();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);

    handler.mockClear();
    emitReadable(stdin, 'a');

    expect(handler).not.toHaveBeenCalled();
  });

  it('dispatches a pasted string as a single call, not once per character', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithInput(handler);

    // No `usePaste` listener mounted, so InputSource falls back to
    // dispatching bracketed-paste content on the plain 'input' channel --
    // see `src/input/InputSource.ts`.
    emitReadable(stdin, '\u001B[200~hello\u001B[201~');

    expect(handler).toHaveBeenCalledExactlyOnceWith(
      'hello',
      expect.objectContaining({ ctrl: false }),
    );

    app.unmount();
  });

  // ink's `options.isActive` genuinely toggles live, because React re-invokes
  // the whole hook (and its `useEffect` dependency array) on every render. A
  // frozen-at-mount boolean would silently drop
  // that -- and it's the exact mechanism ink's documented
  // `useInput(handler, { isActive: isFocused })` idiom depends on.
  it('reactively subscribes and unsubscribes when a ref passed as isActive changes', async () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);
    const isActive = ref(true);

    const app = createApp({
      setup() {
        useInput(handler, { isActive });
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    emitReadable(stdin, 'a');
    expect(handler).toHaveBeenCalledExactlyOnceWith('a', expect.anything());

    isActive.value = false;
    await nextTick();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);

    handler.mockClear();
    emitReadable(stdin, 'b');
    expect(handler).not.toHaveBeenCalled();

    isActive.value = true;
    await nextTick();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(true);

    emitReadable(stdin, 'c');
    expect(handler).toHaveBeenCalledExactlyOnceWith('c', expect.anything());

    app.unmount();
  });

  // The ref-counting mechanism itself is covered in `test/input-source.test.ts`;
  // what this adds is exercising it at the `useInput` level -- two hooks
  // sharing one `Container`'s `InputSource`.
  it('reference-counts raw mode across two useInput subscribers: it stays on until the last one unsubscribes', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);
    const showB = ref(true);

    const ChildA = defineComponent({
      setup() {
        useInput(handlerA);
        return () => h('stdout-text', {}, 'a');
      },
    });

    const ChildB = defineComponent({
      setup() {
        useInput(handlerB);
        return () => h('stdout-text', {}, 'b');
      },
    });

    const app = createApp({
      setup() {
        return () => h('stdout-box', {}, [h(ChildA), showB.value ? h(ChildB) : null]);
      },
    });
    app.mount({ stdin, stdout });

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    // Unmount B while A is still mounted -- InputSource's ref count drops
    // from 2 to 1, which must not touch raw mode.
    showB.value = false;
    await nextTick();

    expect(stdin.setRawMode).not.toHaveBeenCalledWith(false);

    // A is still live and receiving input.
    emitReadable(stdin, 'x');
    expect(handlerA).toHaveBeenCalledExactlyOnceWith('x', expect.anything());
    expect(handlerB).not.toHaveBeenCalled();

    // Unmounting the whole tree drops the count to 0 -- now it turns off.
    app.unmount();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
  });

  // Each mounted `useInput()` attaches its own `'input'` listener directly to
  // `Container['input']` (`InputSource`). Past `EventEmitter`'s default cap
  // of 10 listeners, Node calls `process.emitWarning`, whose default handler
  // prints straight to `process.stderr` -- mid-frame, in a raw-mode TUI, this
  // garbles whatever is on screen -- hence `InputSource`'s one-line
  // `setMaxListeners(0)`, and its constructor comment for the fuller
  // rationale. (`FocusManager` needed the identical fix while it was an
  // `EventEmitter`; it is reactive data now, and
  // `test/use-focus.test.ts`'s sibling test guards it against regrowing a
  // listener per consumer.)
  it('mounting 15 useInput consumers does not emit a MaxListenersExceededWarning', async () => {
    const warnings: string[] = [];
    const onWarning = (warning: Error) => {
      warnings.push(warning.name);
    };
    process.on('warning', onWarning);

    try {
      const stdin = createStdin();
      const stdout = createStdout(20);
      const children = Array.from({ length: 15 }, () =>
        h(
          defineComponent({
            setup() {
              useInput(() => {});
              return () => h('stdout-text', {}, 'x');
            },
          }),
        ),
      );

      const app = createApp(
        { setup: () => () => h('stdout-box', {}, children) },
      );
      app.mount({ stdin, stdout });

      await flush();
      await flush();

      expect(warnings).not.toContain('MaxListenersExceededWarning');

      app.unmount();
    } finally {
      process.off('warning', onWarning);
    }
  });

  it('throws loudly instead of silently no-op-ing when stdin cannot be put into raw mode', () => {
    // A non-TTY `stdin` (piped/redirected input, e.g. `cat data | myapp`) has
    // no `setRawMode` at all on a real stream -- `createStdin(false)` mirrors
    // that. Before this fix, `setRawMode`/`InputSource#subscribe` optional-
    // chained the missing method away and mounted successfully, leaving an
    // app that looked subscribed but never actually read raw keystrokes
    // (input only arriving on Enter, Ctrl+C never intercepted) with nothing
    // anywhere to explain why. Matches ink's own `handleSetRawMode`, which
    // throws for the exact same case.
    const stdin = createStdin(false);
    const stdout = createStdout(20);

    expect(() =>
      createApp({
        setup() {
          useInput(() => {});
          return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
        },
      }).mount({ stdin, stdout }),
    ).toThrow(/raw mode is not supported/i);
  });

  // `useEventListener` in this same package already returns its `stop`; these
  // two built one, handed it to `onScopeDispose`, and threw
  // the reference away -- leaving no escape hatch for a caller outside an
  // effect scope, or one that wants to unsubscribe before its component goes.
  it('returns a stop() that unsubscribes the handler', () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    let stop!: () => void;

    const app = createApp({
      setup() {
        stop = useInput(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    emitReadable(stdin, 'a');
    expect(handler).toHaveBeenCalledTimes(1);

    stop();

    emitReadable(stdin, 'b');
    expect(handler).toHaveBeenCalledTimes(1);

    app.unmount();
  });
});
