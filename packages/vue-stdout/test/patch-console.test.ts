import { h, nextTick, onScopeDispose, ref } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

const ESC = String.fromCharCode(27);

/**
 * `Container.writeConsoleOutput` -- what `console.log`/`info`/`warn`/`error`
 * are patched to reach while an app is mounted (`src/Container.ts`,
 * `src/patchConsole.ts`). Exercised through the public `render()` API rather
 * than the class directly: what's under test is the real, patched global
 * `console`, not a hand-called method.
 */
describe('patchConsole (render() integration)', () => {
  it('a console.log() during a live app lands above the frame, with the frame intact below it -- not interleaved into the middle', async () => {
    const stdout = createStdout(40);
    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout, maxFps: 0 });

    await flush();
    const writesBeforeLog = stdout.getWrites().length;
    expect(stdout.get()).toContain('MARKER_FRAME');

    console.log('MARKER_LOG');

    const newWrites = stdout.getWrites().slice(writesBeforeLog);

    // The console line landed as its own write, containing neither an ANSI
    // erase sequence nor the frame's own text mixed into the same write --
    // proof it was not spliced into the middle of the frame.
    const logWriteIndex = newWrites.findIndex(text => text.includes('MARKER_LOG'));
    expect(logWriteIndex).toBeGreaterThanOrEqual(0);
    const logWrite = newWrites[logWriteIndex]!;
    expect(logWrite).not.toContain('MARKER_FRAME');
    expect(logWrite.includes(ESC)).toBe(false);

    // Something after it erased the old frame off-screen first (an ANSI
    // sequence, not visible text) ...
    const beforeLog = newWrites.slice(0, logWriteIndex);
    expect(beforeLog.some(text => text.includes(ESC))).toBe(true);

    // ... and the frame is repainted immediately after, below the console
    // line, so the screen ends with the frame intact rather than the log
    // line as the last thing written.
    const afterLog = newWrites.slice(logWriteIndex + 1);
    expect(afterLog.some(text => text.includes('MARKER_FRAME'))).toBe(true);
    expect(stdout.get()).toContain('MARKER_FRAME');
    expect(stdout.get()).not.toContain('MARKER_LOG');

    app.unmount();
  });

  it('console.error() routes to the stderr stream, still repainting the stdout frame below it', async () => {
    const stdout = createStdout(40);
    const stderr = createStdout(40);
    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout, stderr, maxFps: 0 });

    await flush();
    console.error('MARKER_ERR');

    expect(stderr.getWrites().some(text => text.includes('MARKER_ERR'))).toBe(true);
    expect(stdout.getWrites().some(text => text.includes('MARKER_ERR'))).toBe(false);
    // The frame is still on `stdout`, repainted after the erase this
    // triggered there.
    expect(stdout.get()).toContain('MARKER_FRAME');

    app.unmount();
  });

  it('does not repaint an already-superseded frame: a console.log mid-throttle forces the pending frame to commit first', async () => {
    // The same hazard `<Static>`'s paired frame hit: the tree can have moved
    // past what is on screen, with its frame owed to the throttle, at the exact
    // moment console output arrives. Painting the stale on-screen frame back
    // would leave outdated content under this console line until the window
    // closes on its own.
    vi.useFakeTimers();
    try {
      const stdout = createStdout(40);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdin: createStdin(), stdout });

      await flush();

      // Land inside the mount frame's own throttle window (`Date` is
      // frozen), same setup `test/max-fps.test.ts` uses.
      for (const value of ['1', '2', '3']) {
        label.value = value;
        await nextTick();
        await flush();
      }

      expect(stdout.get()).not.toContain('3');

      console.log('MARKER_LOG');

      // The frame repainted below the console line must show the CURRENT
      // state ("3"), not whatever was on screen before ("0").
      expect(stdout.get()).toContain('3');
      expect(stdout.get()).not.toContain('MARKER_LOG');

      // The throttle timer that was pending got cancelled by the forced
      // pass, not merely raced -- nothing dangling to fire later.
      expect(vi.getTimerCount()).toBe(0);

      app.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('non-interactive mode: console output passes straight through, no erase sequences, no special handling', async () => {
    const stdout = createStdout(40, false); // non-TTY -> non-interactive
    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout, interactive: false });

    await flush();
    // Nothing has been written yet -- non-interactive mode defers its one
    // frame write to unmount.
    expect(stdout.getWrites()).toEqual([]);

    console.log('MARKER_LOG');

    expect(stdout.getWrites()).toHaveLength(1);
    expect(stdout.get()).toBe('MARKER_LOG\n');
    expect(stdout.get().includes(ESC)).toBe(false);

    app.unmount();

    // The deferred final frame still lands, unaffected by the console write
    // in between.
    expect(stdout.getWrites()).toHaveLength(2);
    expect(stdout.get()).toContain('MARKER_FRAME');
  });

  it('patchConsole: false opts out entirely -- the real global console is left untouched', async () => {
    const stdout = createStdout(40);
    const originalLog = console.log;
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout, patchConsole: false });

    await flush();
    console.log('MARKER_LOG');

    // The real (spied) console.log ran -- it was never replaced by
    // `Container`'s own patch.
    expect(logSpy).toHaveBeenCalledWith('MARKER_LOG');
    expect(stdout.getWrites().some(text => text.includes('MARKER_LOG'))).toBe(false);

    app.unmount();
    logSpy.mockRestore();
    expect(console.log).toBe(originalLog);
  });

  it('is on by default (render()\'s own default, distinct from Container\'s) -- no explicit option needed', async () => {
    const stdout = createStdout(40);
    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout });

    await flush();
    console.log('MARKER_LOG');

    expect(stdout.getWrites().some(text => text.includes('MARKER_LOG'))).toBe(true);

    app.unmount();
  });

  it('restores the real console methods on a clean unmount()', async () => {
    const stdout = createStdout(40);
    const originalLog = console.log;
    const originalWarn = console.warn;

    const app = createApp({ render: () => box({}, span({}, 'MARKER_FRAME')) });
    app.mount({ stdin: createStdin(), stdout });

    await flush();
    expect(console.log).not.toBe(originalLog);

    app.unmount();

    expect(console.log).toBe(originalLog);
    expect(console.warn).toBe(originalWarn);

    // And a subsequent console.log is no longer captured by the (now torn
    // down) app's stdout.
    const writesAtUnmount = stdout.getWrites().length;
    console.log('MARKER_AFTER_UNMOUNT');
    expect(stdout.getWrites().length).toBe(writesAtUnmount);
  });

  it('restores the real console methods even when a disposer throws during unmount() (crash safety)', async () => {
    const stdout = createStdout(40);
    const originalLog = console.log;

    const app = createApp({
      setup() {
        onScopeDispose(() => {
          throw new Error('disposer boom');
        });
        return () => box({}, span({}, 'MARKER_FRAME'));
      },
    });
    app.mount({ stdin: createStdin(), stdout });

    await flush();
    expect(console.log).not.toBe(originalLog);

    // `render.ts`'s `teardown()` calls `container.destroy()` from its own
    // `finally`, so the throw below still leaves the console restored --
    // this is the guarantee the task exists to check, not merely that
    // `unmount()` itself doesn't throw.
    expect(() => app.unmount()).toThrow('disposer boom');

    expect(console.log).toBe(originalLog);
  });

  describe('two concurrent instances (e.g. a short-lived prompt over a long-lived dashboard)', () => {
    it("the first app tearing down first does not break the second app's interception", async () => {
      const stdoutA = createStdout(40);
      const stdoutB = createStdout(40);

      const appA = createApp({ render: () => box({}, span({}, 'MARKER_A')) });
      appA.mount({ stdin: createStdin(), stdout: stdoutA, maxFps: 0 });
      const appB = createApp({ render: () => box({}, span({}, 'MARKER_B')) });
      appB.mount({ stdin: createStdin(), stdout: stdoutB, maxFps: 0 });

      await flush();

      // A, the first to install, tears down first -- a naive per-app
      // snapshot-and-restore would put the REAL console.log back here,
      // silently discarding B's interception even though B is still alive.
      appA.unmount();

      console.log('MARKER_LOG');

      // B's interception must still be working: its own frame is erased,
      // the console line lands, and B's frame is repainted below it --
      // same shape as the single-app test above, just proving B
      // specifically, after A is gone.
      expect(stdoutB.getWrites().some(text => text.includes('MARKER_LOG'))).toBe(true);
      expect(stdoutB.get()).toContain('MARKER_B');
      expect(stdoutB.get()).not.toContain('MARKER_LOG');

      appB.unmount();
    });

    it('console.log ends up as the genuine original once both instances have torn down, in first-torn-down-first order', async () => {
      const originalLog = console.log;
      const stdoutA = createStdout(40);
      const stdoutB = createStdout(40);

      const appA = createApp({ render: () => box({}, span({}, 'MARKER_A')) });
      appA.mount({ stdin: createStdin(), stdout: stdoutA, maxFps: 0 });
      const appB = createApp({ render: () => box({}, span({}, 'MARKER_B')) });
      appB.mount({ stdin: createStdin(), stdout: stdoutB, maxFps: 0 });

      await flush();

      appA.unmount();
      appB.unmount();

      // Not merely "not A's wrapper" -- the actual real original, not B's
      // wrapper either (a naive fix that only guarded against overwriting
      // with a stale snapshot could still leave B's wrapper installed
      // forever, closing over an already-destroyed `Container`).
      expect(console.log).toBe(originalLog);

      const writesAtEnd = stdoutB.getWrites().length;
      console.log('MARKER_AFTER_BOTH_UNMOUNTED');
      expect(stdoutB.getWrites().length).toBe(writesAtEnd);
    });

    it("the SECOND app tearing down first (reverse order) does not break the first app's interception, and console.log is the genuine original once both are gone", async () => {
      // The other two tests in this group both tear down A (installed
      // first) before B (installed second) -- the removal-by-identity this
      // fix depends on (`writers.lastIndexOf(onWrite)` + `splice`, not
      // `writers.pop()`) happens to coincide with plain LIFO popping in
      // that order, since B is genuinely last in the array when A's own
      // restore runs. A naive `pop()` "simplification" would still pass
      // both of those. This is the case that actually needs
      // removal-by-identity: B, the topmost/most-recently-installed writer,
      // tears down FIRST -- `pop()` would still remove the last array
      // element here (B), which is correct by coincidence for B's own
      // removal, but the real distinguishing check is what dispatch does
      // for A *afterwards*, and whether the stack ends up correctly empty
      // once A follows.
      const originalLog = console.log;
      const stdoutA = createStdout(40);
      const stdoutB = createStdout(40);

      const appA = createApp({ render: () => box({}, span({}, 'MARKER_A')) });
      appA.mount({ stdin: createStdin(), stdout: stdoutA, maxFps: 0 });
      const appB = createApp({ render: () => box({}, span({}, 'MARKER_B')) });
      appB.mount({ stdin: createStdin(), stdout: stdoutB, maxFps: 0 });

      await flush();

      // B, installed second (topmost), tears down first.
      appB.unmount();

      console.log('MARKER_LOG');

      // A -- installed first, still alive underneath B -- must resume
      // receiving output now that B is gone.
      expect(stdoutA.getWrites().some(text => text.includes('MARKER_LOG'))).toBe(true);
      expect(stdoutA.get()).toContain('MARKER_A');
      expect(stdoutA.get()).not.toContain('MARKER_LOG');
      expect(stdoutB.getWrites().some(text => text.includes('MARKER_LOG'))).toBe(false);

      appA.unmount();

      expect(console.log).toBe(originalLog);

      const writesAtEnd = stdoutA.getWrites().length;
      console.log('MARKER_AFTER_BOTH_UNMOUNTED');
      expect(stdoutA.getWrites().length).toBe(writesAtEnd);
    });
  });
});
