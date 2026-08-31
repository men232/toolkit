import EventEmitter from 'node:events';
import { h, nextTick } from 'vue';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import { useWindowSize } from '../src/hooks/useWindowSize';
import { createStdout } from './helpers/create-stdout';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * The hole this composable closes is *not* "the ref does not update" -- it
 * is that nothing re-renders. `Container.onResize` re-flows Yoga and
 * schedules a frame, so a purely declarative flex layout already reacts to a
 * resize; a component doing arithmetic on `stdout.columns` in JS does not,
 * because a plain property read creates no reactive dependency and the frame
 * that gets scheduled re-renders the *same* vnodes.
 *
 * So these tests deliberately assert on the rendered terminal output, not on
 * `columns.value`: a test that only checks the ref would pass against a
 * composable that re-renders nothing.
 */
describe('useWindowSize', () => {
  it('re-renders a component that computes from the width when the terminal resizes', async () => {
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        const { columns } = useWindowSize();
        // Arithmetic in JS, not a declarative flex rule -- exactly the
        // case Yoga's own re-flow cannot cover.
        return () => box({}, span({}, '#'.repeat(Math.floor(columns.value / 4))));
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain('#'.repeat(5));

    stdout.columns = 40;
    stdout.emit('resize');
    await nextTick();
    await flush();

    expect(stdout.get()).toContain('#'.repeat(10));

    app.unmount();
  });

  it('reports rows as well, and stops listening once the scope is disposed', async () => {
    const stdout = createStdout(20);

    const app = createApp({
      setup() {
        const { columns, rows } = useWindowSize();
        return () => box({}, span({}, `${columns.value}x${rows.value}`));
      },
    });
    app.mount({ stdout, maxFps: 0 });

    await flush();
    expect(stdout.get()).toContain('20x20');

    stdout.rows = 5;
    stdout.emit('resize');
    await nextTick();
    await flush();

    expect(stdout.get()).toContain('20x5');

    app.unmount();

    // Nothing left subscribed to the stream once the app is gone.
    expect(stdout.listenerCount('resize')).toBe(0);
  });

  // The sibling of `test/use-focus.test.ts`'s and `test/use-input.test.ts`'s
  // own MaxListeners regressions, and for the same reason: a per-consumer
  // subscription on a default-capped emitter (`process.stdout`'s
  // `getMaxListeners()` is Node's default 10, and `Container` already holds
  // one) makes the tenth consumer print
  // `MaxListenersExceededWarning: ...` to stderr *mid-frame*, garbling the
  // very output this package exists to draw. A list of ten-plus rows each
  // sizing itself from `columns` is the ordinary UI this hook is for, so
  // "enough consumers" is not a number this composable gets to pick.
  //
  // `process.emitWarning` defers the `'warning'` emission to a later tick, so
  // this listens for the event directly rather than asserting the absence of
  // a stderr write after some fixed number of ticks.
  it('mounting 15 consumers adds no listeners and emits no MaxListenersExceededWarning', async () => {
    const warnings: string[] = [];
    const onWarning = (warning: Error) => {
      warnings.push(warning.name);
    };
    process.on('warning', onWarning);

    try {
      const stdout = createStdout(20);
      // Exactly what production sees: nothing raises this in `mount()`.
      expect(stdout.getMaxListeners()).toBe(EventEmitter.defaultMaxListeners);

      const Row = {
        setup() {
          const { columns } = useWindowSize();
          return () => span({}, `${columns.value}`);
        },
      };

      const app = createApp({
        setup() {
          return () =>
            box({}, ...Array.from({ length: 15 }, (_, index) => h(Row, { key: index })));
        },
      });
      app.mount({ stdout, maxFps: 0 });

      await flush();

      // `Container`'s own subscription is the only one there is -- consumers
      // derive from shared state instead of each attaching their own.
      expect(stdout.listenerCount('resize')).toBe(1);

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

  // `Container` subscribes to `'resize'` only when `interactive`, and
  // `Container.onResize` is the sole writer of `renderer.width` -- so a hook
  // that subscribed unconditionally would report a live size the layout was
  // never computed at. That is not a cosmetic disagreement: the frame below
  // came out as 60 `#` wrapped into three 20-column lines.
  //
  // Reachable in the wild: `resolveInteractive` is `!isInCi && isTTY`, so a
  // CI runner with a TTY is non-interactive yet still delivers real
  // `SIGWINCH`/`'resize'` events.
  it('reports the size the layout was computed at, not a live one, when non-interactive', async () => {
    const stdout = createStdout(20);
    let reported = 0;

    const app = createApp({
      setup() {
        const { columns } = useWindowSize();
        return () => {
          reported = columns.value;
          return box({}, span({}, '#'.repeat(columns.value)));
        };
      },
    });
    app.mount({ stdout, maxFps: 0, interactive: false });

    await flush();

    stdout.columns = 60;
    stdout.emit('resize');
    await nextTick();
    await flush();

    // Non-interactive mode never re-flows on resize, so the layout is still
    // at 20 -- and what the hook reports has to say so too.
    expect(reported).toBe(20);

    app.unmount();

    // The committed frame agrees: 20 `#` on one line, not 60 wrapped into
    // three.
    const frame = stdout.getWrites().join('');
    expect(frame).toContain('#'.repeat(20));
    expect(frame).not.toContain('#'.repeat(21));
  });
});
