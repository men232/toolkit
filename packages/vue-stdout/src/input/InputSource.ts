// Ported from the input-handling half of ink 7.1.1's `src/components/App.tsx`
// -- its `readable` listener, raw-mode ref counting and pending-escape flush
// timer. This module owns only the stdin subscription and the raw `'input'`/
// `'paste'` events it dispatches; Ctrl+C-exits, focus navigation and
// bracketed-paste toggling live in the hooks on top of it.
//
// Deliberately works in strings, not raw byte chunks: `stdin.read()` after
// `setEncoding('utf8')` returns a `string`, matching ink's own `handleData`
// path. That keeps `parseKeypress`'s `Uint8Array`-mutation hazard (see its
// header) out of reach -- nothing here ever hands it a `Uint8Array`.
import { EventEmitter } from 'node:events';
import process from 'node:process';
import { createInputParser, type InputParser } from './inputParser';

/**
 * A stdin-like stream. Matches `NodeJS.ReadStream`'s relevant surface, but
 * kept minimal so the fake stdin used in tests (`test/helpers/create-stdin.ts`)
 * doesn't need to implement the entire real interface.
 */
export type RawModeStdin = NodeJS.ReadStream;

/**
 * Owns the one `readable` subscription on `stdin` and turns the bytes read
 * off it into discrete `'input'` (and `'paste'`) events via `inputParser`.
 *
 * Raw mode is reference-counted rather than tied to construction: it turns
 * on when the first subscriber calls {@link subscribe} and off when the
 * last one calls {@link unsubscribe} -- matching ink, where multiple
 * `useInput` hooks can be mounted at once and raw mode must survive until
 * all of them are gone. Constructing an `InputSource` touches no terminal
 * state at all; nothing happens until something subscribes.
 */
export class InputSource extends EventEmitter {
  private readonly stdin: RawModeStdin;
  private readonly parser: InputParser = createInputParser();
  private readonly handleReadableBound: () => void;

  private subscriberCount = 0;
  private attached = false;
  private destroyed = false;
  private pendingFlushTimer: ReturnType<typeof setTimeout> | undefined;

  /** Small delay to let chunked escape sequences complete before flushing as literal input. */
  private static readonly pendingFlushDelayMs = 20;

  constructor(stdin: RawModeStdin) {
    super();
    this.stdin = stdin;
    this.handleReadableBound = this.handleReadable.bind(this);

    // Every mounted `useInput()` attaches its own `'input'` listener here, so
    // the default cap of 10 is within reach of an ordinary app -- and past it
    // Node prints a `MaxListenersExceededWarning` straight to `process.stderr`,
    // mid-frame, garbling a raw-mode TUI. Unlimited rather than a higher fixed
    // bound: the consumer count is set by the caller's UI, not by this
    // library, so any fixed bound is the same bug at a later threshold.
    this.setMaxListeners(0);
  }

  /**
   * Whether the underlying stream can actually be put into raw mode. Tests
   * `isTTY`, matching ink, rather than `typeof stdin.setRawMode === 'function'`.
   *
   * The two agree on a genuinely piped `stdin`, which has no `setRawMode` at
   * all. They diverge on a non-TTY stream that still exposes the method (a
   * custom or wrapping stream): `typeof` would call that "supported" and let
   * {@link subscribe} attach with no real raw mode in effect, leaving nothing
   * to explain why keystrokes still arrive line-buffered.
   */
  get isRawModeSupported(): boolean {
    return Boolean(this.stdin.isTTY);
  }

  /**
   * Registers a raw-mode subscriber. The first call attaches the `readable`
   * listener and turns raw mode on; subsequent calls just bump the count.
   * No-op once {@link destroy} has run.
   *
   * Throws rather than silently no-op-ing when {@link isRawModeSupported} is
   * `false`, matching ink's `handleSetRawMode`: a piped `stdin` failing
   * quietly means input only arrives on Enter and Ctrl+C is never
   * intercepted, with nothing to explain why. As in ink, the message names
   * either the process-global default `stdin` or the one passed to
   * `mount()`, whichever the caller controls.
   *
   * `useFocus` checks `isRawModeSupported` first and so never reaches this;
   * `useInput`/`usePaste` call it unconditionally and throw exactly where
   * ink's would.
   */
  subscribe(): void {
    if (this.destroyed) return;

    if (!this.isRawModeSupported) {
      throw new Error(
        this.stdin === process.stdin
          ? 'Raw mode is not supported on the current process.stdin, which ' +
            'vue-stdout uses as the input stream by default.\n' +
            'Check useStdin().isRawModeSupported (or InputSource#isRawModeSupported) ' +
            'before calling setRawMode(true) -- directly, or via useInput()/usePaste().'
          : 'Raw mode is not supported on the stdin passed to mount().\n' +
            'Check useStdin().isRawModeSupported (or InputSource#isRawModeSupported) ' +
            'before calling setRawMode(true) -- directly, or via useInput()/usePaste().',
      );
    }

    this.subscriberCount++;

    if (this.subscriberCount === 1) {
      this.attach();
    }
  }

  /**
   * Releases one subscription. Once the count drops back to zero, the
   * `readable` listener is removed and raw mode is turned off.
   */
  unsubscribe(): void {
    if (this.subscriberCount === 0) return;

    this.subscriberCount--;

    if (this.subscriberCount === 0) {
      this.detach();
    }
  }

  private attach(): void {
    if (this.attached) return;
    this.attached = true;

    this.stdin.setEncoding?.('utf8');
    this.stdin.ref?.();
    this.stdin.setRawMode?.(true);
    this.stdin.addListener('readable', this.handleReadableBound);
  }

  private detach(): void {
    if (!this.attached) return;
    this.attached = false;

    this.stdin.removeListener('readable', this.handleReadableBound);
    this.stdin.setRawMode?.(false);
    this.stdin.unref?.();

    this.clearPendingFlush();
    this.parser.reset();
  }

  private handleReadable(): void {
    this.clearPendingFlush();

    let chunk: string | null;
    // eslint-disable-next-line no-cond-assign
    while ((chunk = this.stdin.read() as string | null) !== null) {
      const events = this.parser.push(chunk);

      for (const event of events) {
        if (typeof event === 'string') {
          this.emit('input', event);
          continue;
        }

        // Paste stays on its own channel so `useInput` handlers never have to
        // branch on mixed key-vs-paste shapes -- but only once a `usePaste`
        // listener exists. Until then it falls back to dispatching the pasted
        // text as ordinary input, same as ink.
        if (this.listenerCount('paste') === 0) {
          this.emit('input', event.paste);
        } else {
          this.emit('paste', event.paste);
        }
      }
    }

    if (this.parser.hasPendingEscape()) {
      this.schedulePendingFlush();
    }
  }

  private schedulePendingFlush(): void {
    this.clearPendingFlush();

    this.pendingFlushTimer = setTimeout(() => {
      this.pendingFlushTimer = undefined;
      const pendingEscape = this.parser.flushPendingEscape();
      if (pendingEscape) {
        this.emit('input', pendingEscape);
      }
    }, InputSource.pendingFlushDelayMs);

    // A ref'd timer would keep the process alive just to flush a lone,
    // already-stale ESC keystroke.
    this.pendingFlushTimer.unref?.();
  }

  private clearPendingFlush(): void {
    if (!this.pendingFlushTimer) return;
    clearTimeout(this.pendingFlushTimer);
    this.pendingFlushTimer = undefined;
  }

  /**
   * Tears down raw mode and every listener this instance holds on `stdin`,
   * regardless of the current subscriber count. Idempotent: safe to call
   * more than once (e.g. from `Container.destroy()`, which is itself
   * idempotent).
   */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.detach();
    this.subscriberCount = 0;
    this.removeAllListeners();
  }
}
