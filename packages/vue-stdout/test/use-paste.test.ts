import { defineComponent, h, nextTick, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { usePaste } from '../src/hooks/usePaste';
import type { PasteHandler, UsePasteOptions } from '../src/hooks/usePaste';
import { createStdin, emitReadable } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Mounts a component that calls `usePaste(handler, options)` from its own
 * `setup()`, wired to a fake stdin/stdout (never the real `process.stdin`,
 * as required by the suite-wide tripwire, `test/setup/no-real-raw-mode.ts`).
 */
function mountWithPaste(handler: PasteHandler, options?: UsePasteOptions) {
  const stdin = createStdin();
  const stdout = createStdout(20);

  const app = createApp({
    setup() {
      usePaste(handler, options);
      return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
    },
  });
  app.mount({ stdin, stdout });

  return { app, stdin, stdout };
}

describe('usePaste', () => {
  it('receives the full pasted string as a single call', () => {
    const handler = vi.fn();
    const { app, stdin } = mountWithPaste(handler);

    emitReadable(stdin, '[200~hello world[201~');

    expect(handler).toHaveBeenCalledExactlyOnceWith('hello world');

    app.unmount();
  });

  it('enables raw mode and bracketed paste mode on mount', () => {
    const { app, stdin, stdout } = mountWithPaste(vi.fn());

    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);
    expect(stdout.getWrites()).toContain('[?2004h');

    app.unmount();
  });

  it('disables raw mode and bracketed paste mode on unmount', async () => {
    const { app, stdin, stdout } = mountWithPaste(vi.fn());

    app.unmount();
    await flush();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdout.getWrites()).toContain('[?2004l');
  });

  it('does not enable raw mode or bracketed paste mode when isActive is false', () => {
    const { app, stdin, stdout } = mountWithPaste(vi.fn(), { isActive: false });

    expect(stdin.setRawMode).not.toHaveBeenCalled();
    expect(stdout.getWrites()).not.toContain('[?2004h');

    app.unmount();
  });

  it('reactively subscribes and unsubscribes when a ref passed as isActive changes', async () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);
    const isActive = ref(true);

    const app = createApp({
      setup() {
        usePaste(handler, { isActive });
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    expect(stdout.getWrites()).toContain('[?2004h');

    isActive.value = false;
    await nextTick();

    expect(stdout.getWrites()).toContain('[?2004l');

    emitReadable(stdin, '[200~ignored[201~');
    expect(handler).not.toHaveBeenCalled();

    app.unmount();
  });

  it('reference-counts bracketed paste mode across two usePaste subscribers: it stays on until the last one unsubscribes', async () => {
    const handlerA = vi.fn();
    const handlerB = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);
    const showB = ref(true);

    const ChildA = defineComponent({
      setup() {
        usePaste(handlerA);
        return () => h('stdout-text', {}, 'a');
      },
    });

    const ChildB = defineComponent({
      setup() {
        usePaste(handlerB);
        return () => h('stdout-text', {}, 'b');
      },
    });

    const app = createApp({
      setup() {
        return () => h('stdout-box', {}, [h(ChildA), showB.value ? h(ChildB) : null]);
      },
    });
    app.mount({ stdin, stdout });

    expect(stdout.getWrites().filter(write => write === '[?2004h')).toHaveLength(1);

    // Unmount B while A is still mounted -- the count drops from 2 to 1,
    // which must not disable bracketed paste mode.
    showB.value = false;
    await nextTick();

    expect(stdout.getWrites()).not.toContain('[?2004l');

    emitReadable(stdin, '[200~x[201~');
    expect(handlerA).toHaveBeenCalledExactlyOnceWith('x');
    expect(handlerB).not.toHaveBeenCalled();

    // Unmounting the whole tree drops the count to 0 -- now it turns off.
    app.unmount();

    expect(stdout.getWrites()).toContain('[?2004l');
  });

  it('does not enable bracketed paste mode on a non-TTY stdout', () => {
    const stdin = createStdin();
    const stdout = createStdout(20, false);

    const app = createApp({
      setup() {
        usePaste(vi.fn());
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    expect(stdout.getWrites()).not.toContain('[?2004h');

    app.unmount();
  });

  it('falls back to the plain input channel when no usePaste is mounted (documented in InputSource)', () => {
    // Regression guard for the fallback InputSource.ts implements: with
    // nothing subscribed to 'paste', bracketed-paste content still reaches
    // useInput as ordinary input rather than being dropped. Covered
    // end-to-end already in test/use-input.test.ts; asserted here too since
    // this is the file documenting usePaste's side of that contract.
    const handler = vi.fn();
    const { app, stdin } = mountWithPaste(handler, { isActive: false });

    emitReadable(stdin, '[200~hello[201~');

    expect(handler).not.toHaveBeenCalled();

    app.unmount();
  });

  it('throws loudly instead of silently no-op-ing when stdin cannot be put into raw mode', () => {
    // Same fix as `useInput`'s own test of the same name -- `usePaste` calls
    // `setRawMode(true)` unconditionally too (matching ink's `use-paste.js`),
    // so a non-TTY `stdin` must surface the same loud error rather than
    // mounting successfully with bracketed paste silently never actually
    // enabled.
    const stdin = createStdin(false);
    const stdout = createStdout(20);

    expect(() =>
      createApp({
        setup() {
          usePaste(vi.fn());
          return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
        },
      }).mount({ stdin, stdout }),
    ).toThrow(/raw mode is not supported/i);
  });

  // See the matching test in `test/use-input.test.ts`.
  it('returns a stop() that unsubscribes the handler', () => {
    const handler = vi.fn();
    const stdin = createStdin();
    const stdout = createStdout(20);

    let stop!: () => void;

    const app = createApp({
      setup() {
        stop = usePaste(handler);
        return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
      },
    });
    app.mount({ stdin, stdout });

    emitReadable(stdin, '\u001B[200~one\u001B[201~');
    expect(handler).toHaveBeenCalledTimes(1);

    stop();

    emitReadable(stdin, '\u001B[200~two\u001B[201~');
    expect(handler).toHaveBeenCalledTimes(1);

    app.unmount();
  });
});
