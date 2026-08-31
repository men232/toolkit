// `test/exit-teardown.test.ts` mocks `signal-exit` wholesale, which proves
// `render()`'s own bookkeeping is app-scoped but never exercises the *real*
// `Emitter.emit()` -- and that's exactly where the hazard lives.
//
// `signal-exit`'s `Emitter.emit(ev, ...)` iterates its listener array with
// `for (const fn of this.listeners[ev])` -- a live reference, not a copy.
// `removeListener` splices that same array. `render.ts`'s `teardown()`
// used to call the `unregisterExit` function `onExit()` returns as its
// *first* action -- so with two or more concurrent `render()` instances,
// the callback that fires first synchronously splices itself out of the
// array `emit()` is mid-iteration over, shifting the *next* listener down
// into the slot the for-loop has already passed and skipping it entirely.
// With instances registered in order A, B, C: A's callback fires and
// splices A out (index 0), shifting B to index 0 and C to index 1 -- but
// the iterator has already moved past index 0, so it resumes at index 1,
// which is now C. B is skipped outright; its `setRawMode(false)` never
// runs, leaving that app's terminal in raw mode after the process
// exits.
//
// Deliberately NOT mocked: this file uses the real `signal-exit` package,
// which patches the real `process.emit`/`process.reallyExit` the first
// time any `onExit()` call anywhere in this process loads it, and stores
// its listener emitter on a `Symbol.for('signal-exit emitter')` global --
// by design, so multiple copies/versions of the package still cooperate.
// That emitter's `emitted.exit` flag latches permanently, for the
// lifetime of this worker process, the first time 'exit' is actually
// emitted through it. Exactly one test, in this one file, may ever do
// that: a second such test (here or in a worker that reuses this process
// across files) would silently find `emit()` a no-op and prove nothing.
import { h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { useInput } from '../src/hooks/useInput';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

describe('render() / process-exit teardown (real signal-exit)', () => {
  it('releases raw mode for every concurrent app when the process actually exits', async () => {
    const mountOne = () => {
      const stdin = createStdin();
      const stdout = createStdout(20);

      createApp({
        setup() {
          useInput(vi.fn());
          return () => h('stdout-box', {}, h('stdout-text', {}, 'x'));
        },
      }).mount({ stdin, stdout });

      return stdin;
    };

    // Order matters: this is what puts each app's `onExit` callback
    // into `signal-exit`'s listener array in A/B/C order, same as the
    // reviewer's repro.
    const stdinA = mountOne();
    const stdinB = mountOne();
    const stdinC = mountOne();

    expect(stdinA.setRawMode).toHaveBeenLastCalledWith(true);
    expect(stdinB.setRawMode).toHaveBeenLastCalledWith(true);
    expect(stdinC.setRawMode).toHaveBeenLastCalledWith(true);

    // The exact path every SIGINT, SIGTERM, and crash takes: `signal-exit`
    // patched `process.emit` in `load()` (triggered by the first `onExit()`
    // call above, inside `src/render.ts`), so this synthetic call is
    // intercepted the same way a real one would be -- it does not actually
    // terminate this process, only dispatches the 'exit' event through the
    // real `Emitter`.
    process.emit('exit' as unknown as 'exit', 0 as unknown as never);

    await new Promise<void>(resolve => process.nextTick(resolve));
    await new Promise<void>(resolve => queueMicrotask(resolve));

    expect(stdinA.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdinB.setRawMode).toHaveBeenLastCalledWith(false);
    expect(stdinC.setRawMode).toHaveBeenLastCalledWith(false);
  });
});
