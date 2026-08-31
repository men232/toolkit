import { describe, expect, it, vi } from 'vitest';
import { InputSource } from '../src/input/InputSource';
import { Container } from '../src/Container';
import { createStdin, emitReadable } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

describe('InputSource', () => {
  it('dispatches a plain key as an input event', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);
    const onInput = vi.fn();
    source.on('input', onInput);

    source.subscribe();
    emitReadable(stdin, 'a');

    expect(onInput).toHaveBeenCalledExactlyOnceWith('a');

    source.unsubscribe();
  });

  it('dispatches an escape sequence read across one chunk as a single event', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);
    const onInput = vi.fn();
    source.on('input', onInput);

    source.subscribe();
    emitReadable(stdin, '[A'); // up arrow

    expect(onInput).toHaveBeenCalledExactlyOnceWith('[A');

    source.unsubscribe();
  });

  it('dispatches every event carried by a single read', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);
    const onInput = vi.fn();
    source.on('input', onInput);

    source.subscribe();
    emitReadable(stdin, 'a[Ab');

    expect(onInput).toHaveBeenNthCalledWith(1, 'a');
    expect(onInput).toHaveBeenNthCalledWith(2, '[A');
    expect(onInput).toHaveBeenNthCalledWith(3, 'b');
    expect(onInput).toHaveBeenCalledTimes(3);

    source.unsubscribe();
  });

  it('emits bracketed paste content on the paste channel once something is listening for it', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);
    const onInput = vi.fn();
    const onPaste = vi.fn();
    source.on('input', onInput);
    source.on('paste', onPaste);

    source.subscribe();
    emitReadable(stdin, '[200~hello[201~');

    expect(onPaste).toHaveBeenCalledExactlyOnceWith('hello');
    expect(onInput).not.toHaveBeenCalled();

    source.unsubscribe();
  });

  it('falls back to dispatching paste content as input when nothing listens for paste', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);
    const onInput = vi.fn();
    source.on('input', onInput);

    source.subscribe();
    emitReadable(stdin, '[200~hello[201~');

    expect(onInput).toHaveBeenCalledExactlyOnceWith('hello');

    source.unsubscribe();
  });

  it('flushes a lone pending escape as literal input after the debounce delay', () => {
    vi.useFakeTimers();
    try {
      const stdin = createStdin();
      const source = new InputSource(stdin);
      const onInput = vi.fn();
      source.on('input', onInput);

      source.subscribe();
      emitReadable(stdin, '');

      expect(onInput).not.toHaveBeenCalled();

      vi.advanceTimersByTime(20);

      expect(onInput).toHaveBeenCalledExactlyOnceWith('');

      source.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });

  it('turns raw mode on only for the first subscriber and off only for the last', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);

    source.subscribe();
    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);

    source.subscribe();
    // A second subscriber must not re-enable raw mode or re-attach the
    // listener -- ink's own ref-counted behavior.
    expect(stdin.setRawMode).toHaveBeenCalledExactlyOnceWith(true);
    expect(stdin.listenerCount('readable')).toBe(1);

    source.unsubscribe();
    expect(stdin.setRawMode).not.toHaveBeenCalledWith(false);

    source.unsubscribe();
    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);
  });

  it('destroy() tears down raw mode and the readable listener, and is idempotent', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);

    source.subscribe();
    expect(stdin.listenerCount('readable')).toBe(1);

    source.destroy();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);

    const callsAfterFirstDestroy = (stdin.setRawMode as ReturnType<typeof vi.fn>)
      .mock.calls.length;

    expect(() => source.destroy()).not.toThrow();
    expect((stdin.setRawMode as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callsAfterFirstDestroy,
    );
  });

  it('ignores subscribe() once destroyed', () => {
    const stdin = createStdin();
    const source = new InputSource(stdin);

    source.destroy();
    source.subscribe();

    expect(stdin.listenerCount('readable')).toBe(0);
    expect(stdin.setRawMode).not.toHaveBeenCalledWith(true);
  });

  it('isRawModeSupported reflects stdin.isTTY, not whether setRawMode exists', () => {
    const ttySource = new InputSource(createStdin(true));
    expect(ttySource.isRawModeSupported).toBe(true);

    const nonTtySource = new InputSource(createStdin(false));
    expect(nonTtySource.isRawModeSupported).toBe(false);
  });

  it('subscribe() throws instead of silently no-op-ing when raw mode is unsupported', () => {
    const stdin = createStdin(false);
    const source = new InputSource(stdin);

    expect(() => source.subscribe()).toThrow(/raw mode is not supported/i);
    expect(stdin.listenerCount('readable')).toBe(0);
  });

  it('the error names process.stdin specifically when that is the default stream', () => {
    const source = new InputSource(process.stdin);

    // Never actually subscribes (that would put the real terminal in raw
    // mode -- forbidden by `test/setup/no-real-raw-mode.ts`); this only
    // exercises the message-selection branch, which reads `this.stdin ===
    // process.stdin` without calling anything on it.
    if (process.stdin.isTTY) {
      // The test runner's own stdin happens to be a TTY (interactive run) --
      // nothing to assert here; the non-TTY branch below is what covers this
      // message.
      return;
    }

    expect(() => source.subscribe()).toThrow(/process\.stdin, which vue-stdout uses/i);
  });

  it('the error names the provided stdin when it is not the default stream', () => {
    const stdin = createStdin(false);
    const source = new InputSource(stdin);

    expect(() => source.subscribe()).toThrow(/stdin passed to mount\(\)/i);
  });
});

describe('InputSource wired through Container', () => {
  it('leaves raw mode off and stdin listener-free after Container.destroy(), even mid-subscription', () => {
    const stdout = createStdout(20);
    const stdin = createStdin();
    const container = new Container({
      stdout,
      stdin,
      stderr: createStdout(20),
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
    });

    container.input.subscribe();
    expect(stdin.listenerCount('readable')).toBeGreaterThan(0);

    container.destroy();

    expect(stdin.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdin.listenerCount('readable')).toBe(0);

    // Idempotent, the same class of assertion `test/render.test.ts` pins for
    // `stdout`'s `resize` listener.
    expect(() => container.destroy()).not.toThrow();
  });

  it('never touches raw mode when input is never subscribed to', () => {
    const stdout = createStdout(20);
    const stdin = createStdin();
    const container = new Container({
      stdout,
      stdin,
      stderr: createStdout(20),
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
    });

    container.destroy();

    expect(stdin.setRawMode).not.toHaveBeenCalled();
  });
});
