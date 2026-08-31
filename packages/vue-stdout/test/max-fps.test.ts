import { type Ref, h, nextTick, ref, watch } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { Container } from '../src/Container';
import { Static } from '../src/components/Static';
import { Box } from '../src/components/Box';
import { Text } from '../src/components/Text';
import { useBoxMetrics } from '../src/hooks/useBoxMetrics';
import { useDOMElement } from '../src/hooks/useDOMElement';
import { Renderer } from '../src/tree/render';
import { createStdin } from './helpers/create-stdin';
import { type FakeStdout, createStdout } from './helpers/create-stdout';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

/**
 * Drives `count` reactive updates back to back, each one settled (Vue's own
 * `nextTick()` plus this renderer's `process.nextTick`-scheduled layout
 * pass -- see `src/tree/render.ts`) before the next fires. Real elapsed time
 * between them is a fraction of a millisecond either way, but with
 * `vi.useFakeTimers()` active (every test below wraps itself in one) `Date`
 * is faked too, and does not advance on its own -- so every one of these
 * updates lands well inside the same `maxFps` window, deterministically,
 * rather than depending on how fast the test happens to run.
 */
async function burst(label: { value: string }, count: number): Promise<void> {
  for (let i = 1; i <= count; i++) {
    label.value = String(i);
    await nextTick();
    await flush();
  }
}

describe('maxFps', () => {
  it('computes only the frames it shows: the throttle is upstream of layout and paint', async () => {
    // The property this whole feature is arranged around, and the one thing
    // no other test in this file can see: `Renderer#render()` is the
    // layout+paint pass, and it must not run for a frame the throttle is
    // going to discard. Measured end to end before this was true, a 125 Hz
    // source at `maxFps: 30` computed 400 frames to show 104 -- three
    // quarters of the engine's CPU spent on frames nobody would ever see.
    vi.useFakeTimers();
    const renderSpy = vi.spyOn(Renderer.prototype, 'render');
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      renderSpy.mockClear();

      await burst(label, 5);

      // `Date` is frozen, so all 5 landed inside the mount frame's own
      // window and at most one of them could ever be shown. Nothing was
      // laid out or painted for any of them.
      expect(renderSpy).not.toHaveBeenCalled();

      // The window closes: exactly one pass, for the newest state.
      vi.advanceTimersByTime(34);
      await flush();

      expect(renderSpy).toHaveBeenCalledTimes(1);
      expect(stdout.get()).toContain('5');
      expect(stdout.get()).not.toContain('4');

      app.unmount();
    } finally {
      renderSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('maxFps: 0 computes every frame -- the throttle is the only thing that ever skips a pass', async () => {
    // The control for the test above: same burst, same assertions on the
    // same spy, with the throttle out of the way. Without this, "not called"
    // above would also pass against a renderer that had simply stopped
    // rendering.
    vi.useFakeTimers();
    const renderSpy = vi.spyOn(Renderer.prototype, 'render');
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout, maxFps: 0 });

      await flush();
      renderSpy.mockClear();

      await burst(label, 5);

      expect(renderSpy).toHaveBeenCalledTimes(5);

      app.unmount();
    } finally {
      renderSpy.mockRestore();
      vi.useRealTimers();
    }
  });

  it('throttles a rapid burst to fewer writes than updates (default maxFps: 30)', async () => {
    vi.useFakeTimers();
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      const writesAfterMount = stdout.getWrites().length;

      await burst(label, 5);

      const writesDuringBurst = stdout.getWrites().length - writesAfterMount;

      // 5 updates; at most one of them can have committed by now (the
      // leading edge, if the mount frame's own window had already closed --
      // it hadn't, so here it's 0) plus nothing else, since the whole burst
      // ran inside one throttle window with `Date` frozen.
      expect(writesDuringBurst).toBeLessThan(5);

      app.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('never loses the trailing frame: the screen shows the final state once the burst settles', async () => {
    vi.useFakeTimers();
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      await burst(label, 5);

      // Nothing from the burst has actually reached the screen yet -- see
      // the previous test -- so asserting that here would be redundant.
      // What matters is what happens once the burst goes quiet: advancing
      // past the throttle window (`Math.ceil(1000 / 30)` = 34ms) must fire
      // the trailing commit with the LATEST state ("5"), not whichever
      // update happened to be pending first, and not silently drop it.
      vi.advanceTimersByTime(34);
      await flush();

      expect(stdout.get()).toContain('5');
      expect(stdout.get()).not.toContain('4');

      app.unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('still delivers the trailing frame if unmount() runs before the throttle window closes', async () => {
    // The mandatory guarantee this feature exists for must hold even when
    // nothing ever advances the clock again -- i.e. when the app exits
    // mid-burst rather than going quiet on its own. Teardown must compute and
    // write the frame it still owes, rather than relying on the timer it is
    // about to cancel.
    vi.useFakeTimers();
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      await burst(label, 3);

      expect(stdout.get()).not.toContain('3');

      app.unmount();

      expect(stdout.get()).toContain('3');

      // The pending timer was cancelled, not merely fired once, and
      // teardown didn't leave anything scheduled behind it.
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a cancelled throttle timer cannot fire again and double-write after teardown', async () => {
    vi.useFakeTimers();
    try {
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      await burst(label, 3);

      app.unmount();
      const writesAtUnmount = stdout.getWrites().length;

      // If `destroy()` had left the timer running instead of clearing it,
      // this would fire it now, against a `stdout` the app no longer
      // owns.
      vi.advanceTimersByTime(1000);

      expect(stdout.getWrites().length).toBe(writesAtUnmount);
    } finally {
      vi.useRealTimers();
    }
  });

  describe('maxFps: 0 (unlimited)', () => {
    it('is a deliberate, distinct case: every frame commits immediately, same as no throttling at all', async () => {
      vi.useFakeTimers();
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const app = createApp({ render: () => box({}, span({}, label.value)) });
        app.mount({ stdout, maxFps: 0 });

        await flush();

        await burst(label, 5);

        // Every one of the 5 updates reached the screen on its own -- no
        // throttle window ever gets consulted with `maxFps: 0`, so nothing
        // in between got coalesced away (unlike the throttled case, where
        // "4" never makes it -- see the other tests in this file).
        const allWrites = stdout.getWrites().join('');
        for (const value of ['1', '2', '3', '4', '5']) {
          expect(allWrites).toContain(value);
        }
        expect(stdout.get()).toContain('5');

        // Nothing left pending -- there is no throttle timer to leak.
        expect(vi.getTimerCount()).toBe(0);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('onRender', () => {
    it('is called once per committed frame, with { renderTime } shaped like ink\'s RenderMetrics', async () => {
      vi.useFakeTimers();
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const onRender = vi.fn();
        const app = createApp({ render: () => box({}, span({}, label.value)) });
        app.mount({ stdout, maxFps: 0, onRender });

        await flush();
        expect(onRender).toHaveBeenCalledTimes(1);
        expect(onRender).toHaveBeenLastCalledWith({ renderTime: expect.any(Number) });

        label.value = '1';
        await nextTick();
        await flush();

        expect(onRender).toHaveBeenCalledTimes(2);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it('is called fewer times than updates when throttled, matching the reduced write count', async () => {
      vi.useFakeTimers();
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const onRender = vi.fn();
        const app = createApp({ render: () => box({}, span({}, label.value)) });
        app.mount({ stdout, onRender });

        await flush();
        const callsAfterMount = onRender.mock.calls.length;

        await burst(label, 5);

        expect(onRender.mock.calls.length - callsAfterMount).toBeLessThan(5);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('debug mode', () => {
    it('bypasses the cap outright: every update is computed and appended, none coalesced', async () => {
      // `debug`'s contract is "one appended record per update, nothing erased,
      // nothing discarded" (see `Container.debug`), and ink sets its own
      // `unthrottled` flag whenever `options.debug` is. That was a bypass of
      // the *write* while the throttle sat downstream; with the throttle
      // ahead of the pass it has to be a bypass of the pass, or `debug`
      // silently loses the very records it exists to keep.
      vi.useFakeTimers();
      const renderSpy = vi.spyOn(Renderer.prototype, 'render');
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const app = createApp({ render: () => box({}, span({}, label.value)) });
        // `maxFps` left at `mount()`'s own default of 30 -- the point is that
        // `debug` wins over it, so overriding it here would test nothing.
        app.mount({ stdout, debug: true });

        await flush();
        renderSpy.mockClear();
        const writesAfterMount = stdout.getWrites().length;

        await burst(label, 5);

        expect(renderSpy).toHaveBeenCalledTimes(5);
        expect(stdout.getWrites().length - writesAfterMount).toBe(5);

        const allWrites = stdout.getWrites().join('');
        for (const value of ['1', '2', '3', '4', '5']) {
          expect(allWrites).toContain(value);
        }

        // No window was ever consulted, so no trailing edge was ever armed.
        expect(vi.getTimerCount()).toBe(0);

        app.unmount();
      } finally {
        renderSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe('non-interactive mode', () => {
    it('composes with maxFps rather than fighting it: still only the final frame, at unmount', async () => {
      // Throttling is meaningless once only one write (at `destroy()`) ever
      // happens at all -- this pins that the two features don't interact in
      // some surprising way (an extra write, a delayed final frame) when
      // both are in play at once. The `render` spy is what makes it a real
      // assertion now that the cap decides whether the *pass* runs: this mode
      // must keep computing every update, because the one deferred write has
      // nothing but the newest computed frame to write.
      vi.useFakeTimers();
      const renderSpy = vi.spyOn(Renderer.prototype, 'render');
      try {
        const stdout = createStdout(20, false); // non-TTY -> non-interactive
        const label = ref('0');
        const app = createApp({ render: () => box({}, span({}, label.value)) });
        app.mount({ stdout, interactive: false });

        await flush();
        renderSpy.mockClear();
        await burst(label, 5);

        expect(renderSpy).toHaveBeenCalledTimes(5);
        expect(stdout.getWrites()).toEqual([]);

        app.unmount();

        expect(stdout.getWrites()).toHaveLength(1);
        expect(stdout.get()).toContain('5');
      } finally {
        renderSpy.mockRestore();
        vi.useRealTimers();
      }
    });
  });

  describe('<Static> interaction', () => {
    it('a <Static> flush mid-burst still commits its paired frame immediately, not up to a whole throttle window later', async () => {
      // `Renderer#render()` (`src/tree/render.ts`) emits `'static'`
      // synchronously and then `'frame'` for the very same pass -- always
      // paired, one render() call apart. `onStatic` writes unconditionally,
      // with no throttle of its own, but its paired frame goes through
      // `canComputeFrame` like any other and could, without the bypass this
      // pins, wait up to a whole throttle window -- leaving the static
      // content it belongs above sitting alone on screen with no frame under
      // it in the meantime.
      vi.useFakeTimers();
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const items = ref(['a']);

        const app = createApp({
          render: () =>
            box(
              {},
              h(
                Static,
                { items: items.value },
                { default: ({ item }: { item: string }) => span({ key: item }, item) },
              ),
              span({}, label.value),
            ),
        });
        app.mount({ stdout });

        await flush();

        // Mid-burst: `Date` is frozen (fake timers), so every one of these
        // lands inside the mount frame's own throttle window and stays
        // buffered -- exactly the same starting state the other throttle
        // tests in this file rely on.
        await burst(label, 3);
        expect(stdout.get()).not.toContain('3');

        // A genuinely new static item, still mid-burst, with the throttle
        // window still open (nothing has advanced the fake clock).
        items.value = [...items.value, 'b'];
        await nextTick();
        await flush();

        // The static write always lands (unconditional) -- what's under
        // test is that its *paired* frame landed with it, showing the
        // CURRENT label ("3"), not a stale one and not nothing. `<Static>`
        // content is excluded from the ordinarily-repainted frame (see
        // `test/static.test.ts`), so the frame itself never contains "b".
        expect(stdout.get()).toContain('3');
        expect(stdout.get()).not.toContain('b');

        // No trailing timer left dangling from the earlier, still-open
        // throttle window -- the forced commit above must have cancelled
        // it, not merely raced it.
        expect(vi.getTimerCount()).toBe(0);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it('has its content computed inside a throttled window, not deferred to the end of one', async () => {
      // The delicate half of moving the throttle ahead of computation.
      // `<Static>` output does not exist until `Renderer#render()` produces
      // it -- so "the flush bypasses `maxFps`" is only true if the *pass*
      // bypasses it too. A gate that looked only at the clock would leave
      // permanent, scroll-into-history content sitting uncomputed for up to
      // a whole window. ink has the same escape hatch, as `isStaticDirty`
      // -> `onImmediateRender` in its reconciler.
      vi.useFakeTimers();
      const renderSpy = vi.spyOn(Renderer.prototype, 'render');
      try {
        const stdout = createStdout(20);
        const label = ref('0');
        const items = ref<string[]>([]);

        const app = createApp({
          render: () =>
            box(
              {},
              h(
                Static,
                { items: items.value },
                { default: ({ item }: { item: string }) => span({ key: item }, item) },
              ),
              span({}, label.value),
            ),
        });
        app.mount({ stdout });

        await flush();
        renderSpy.mockClear();

        // Plain updates inside the window: nothing computed, as above.
        await burst(label, 3);
        expect(renderSpy).not.toHaveBeenCalled();

        // A new static item, same window, clock still frozen.
        items.value = ['only-item'];
        await nextTick();
        await flush();

        expect(renderSpy).toHaveBeenCalledTimes(1);
        // The static write lands before its paired frame, so it is not the
        // last write -- `get()` returns that frame, showing the current label.
        expect(stdout.getWrites().join('')).toContain('only-item');
        expect(stdout.get()).toContain('3');
        expect(vi.getTimerCount()).toBe(0);

        app.unmount();
      } finally {
        renderSpy.mockRestore();
        vi.useRealTimers();
      }
    });

    it('bypasses the window for a shrink too, which prints nothing but must still be recorded', async () => {
      // `collectStaticOutput` is the only writer of `staticFlushedCount`, and
      // clamping that count back down when `items` shrinks is what stops the
      // next item landing in the vacated range from being lost forever (see
      // `src/tree/staticFlush.ts`). A gate that let the pass through only for
      // *new* children would never observe the shrink, stranding the count
      // above the child list -- the same silent loss, reached through the
      // throttle instead. `test/static.test.ts` covers the shrink itself;
      // this covers the shrink happening inside a throttle window.
      vi.useFakeTimers();
      try {
        const stdout = createStdout(40);
        const items = ref(['a', 'b', 'c']);
        const countWritesContaining = (needle: string) =>
          stdout.getWrites().filter(text => text.includes(needle)).length;

        const app = createApp({
          render: () =>
            box(
              {},
              h(
                Static,
                { items: items.value },
                { default: ({ item }: { item: string }) => span({ key: item }, item) },
              ),
            ),
        });
        app.mount({ stdout });

        await flush();
        expect(countWritesContaining('c')).toBe(1);

        // Both of these land inside the mount frame's own window -- `Date` is
        // frozen and never advances again in this test.
        items.value = ['a'];
        await nextTick();
        await flush();

        items.value = ['a', 'd'];
        await nextTick();
        await flush();

        expect(countWritesContaining('d')).toBe(1);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('layout measurement under the throttle', () => {
    /**
     * `measureElement`, `useBoxMetrics` and `useContainerSize` all read
     * computed layout, and the `layout`/`resize` events that refresh them are
     * emitted by the paint pass. Moving the throttle ahead of that pass
     * therefore changes how often they refresh: once per *shown* frame, where
     * it used to be once per DOM change. These three tests are that contract.
     *
     * It is a deliberate narrowing, not a casualty. The refreshes it drops
     * described frames nobody could see, so what these hooks report is now
     * exactly the geometry on the terminal -- the same standard the read-only
     * refs themselves are held to. What it must never do is leave a consumer
     * reporting a value the terminal has moved past, and the last two tests
     * are the two ways a burst can end.
     */
    function mountMeasured(stdout: FakeStdout, maxFps: number) {
      const label = ref('x');
      const seen: number[] = [];
      let width!: Readonly<Ref<number>>;

      const app = createApp({
        setup() {
          const element = useDOMElement();
          const metrics = useBoxMetrics(element);
          width = metrics.width;

          watch(
            () => metrics.width.value,
            next => seen.push(next),
          );

          return () =>
            h(Box, { width: label.value.length + 2 }, () =>
              h(Text, {}, () => label.value),
            );
        },
      });

      app.mount({ stdout, maxFps });

      return { app, label, seen, width: () => width.value };
    }

    it('refreshes once per shown frame, not once per update', async () => {
      vi.useFakeTimers();
      try {
        const throttled = mountMeasured(createStdout(40), 30);
        await flush();

        // Eight distinct widths, all inside one frozen throttle window.
        for (let i = 1; i <= 8; i++) {
          throttled.label.value = 'x'.repeat(i);
          await nextTick();
          await flush();
        }
        vi.advanceTimersByTime(34);
        await flush();

        const unthrottled = mountMeasured(createStdout(40), 0);
        await flush();
        for (let i = 1; i <= 8; i++) {
          unthrottled.label.value = 'x'.repeat(i);
          await nextTick();
          await flush();
        }

        // The unthrottled app sees every intermediate width; the throttled
        // one sees only the widths that were actually put on the terminal.
        expect(unthrottled.seen.length).toBeGreaterThan(throttled.seen.length);
        // ...and what it does see is real: the last shown frame's width.
        expect(throttled.seen.at(-1)).toBe(10);
        expect(unthrottled.seen.at(-1)).toBe(10);

        throttled.app.unmount();
        unthrottled.app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it('is never left stale: a burst that goes quiet delivers its settled measurement', async () => {
      vi.useFakeTimers();
      try {
        const { app, label, seen, width } = mountMeasured(createStdout(40), 30);
        await flush();

        // The mount frame is shown immediately, so it is measured; everything
        // after it here lands inside that frame's own window.
        const afterMount = seen.length;

        for (let i = 1; i <= 5; i++) {
          label.value = 'x'.repeat(i);
          await nextTick();
          await flush();
        }

        // Nothing more has been shown, so nothing more has been measured --
        // and what is reported is still honestly the frame on screen.
        expect(seen.length).toBe(afterMount);
        expect(width()).toBe(3);

        vi.advanceTimersByTime(34);
        await flush();
        await nextTick();

        expect(seen.at(-1)).toBe(7);
        expect(width()).toBe(7);

        app.unmount();
      } finally {
        vi.useRealTimers();
      }
    });

    it('is never left stale: an app that exits mid-window measures its trailing frame too', async () => {
      // The other way a burst ends, and the one nothing will ever advance a
      // clock for. `Renderer#destroy()` computes the owed frame, so the pass
      // that puts the final state on screen is also the pass that measures it.
      //
      // The assertion is on the ref rather than on the `watch` above it: Vue
      // stops a component's watchers as part of `app.unmount()`, in this same
      // tick, so its queued pre-flush job is discarded -- its own unmount
      // semantics, with or without a throttle. The reported measurement is
      // still the settled one.
      vi.useFakeTimers();
      try {
        const { app, label, width } = mountMeasured(createStdout(40), 30);
        await flush();

        for (let i = 1; i <= 5; i++) {
          label.value = 'x'.repeat(i);
          await nextTick();
          await flush();
        }

        expect(width()).toBe(3);

        app.unmount();

        expect(width()).toBe(7);
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('default cadence, real timers (no fake-timer simulation)', () => {
    it('coalesces a rapid burst under the real ~34ms default window, and still delivers the trailing frame', async () => {
      // Every other test in this file proves the throttle *logic* under
      // `vi.useFakeTimers()`. This one proves the *wiring* -- that
      // `render()`'s real default (`maxFps: 30`, unlike `Container`'s own
      // unlimited default -- see the "direct construction" test below)
      // actually arms a real `setTimeout` against the real clock, and that
      // it really fires.
      const stdout = createStdout(20);
      const label = ref('0');
      const app = createApp({ render: () => box({}, span({}, label.value)) });
      app.mount({ stdout });

      await flush();
      const writesAfterMount = stdout.getWrites().length;

      for (let i = 1; i <= 5; i++) {
        label.value = String(i);
        await nextTick();
        await flush();
      }

      const writesDuringBurst = stdout.getWrites().length - writesAfterMount;
      expect(writesDuringBurst).toBeLessThan(5);
      expect(stdout.get()).not.toContain('5');

      // A real wait, comfortably past the ~34ms window (no
      // `vi.advanceTimersByTime` -- there is no fake clock here to advance).
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(stdout.get()).toContain('5');
      expect(stdout.get()).not.toContain('4');

      app.unmount();
    }, 5000);
  });

  describe('Container -- direct construction', () => {
    it('defaults to unlimited (maxFps omitted) so tests constructing it directly keep committing every frame immediately', () => {
      const stdout = createStdout(20);
      const container = new Container({
        debug: false,
        exitOnCtrlC: true,
        interactive: true,
        stdin: createStdin(),
        stdout,
        stderr: createStdout(20, false),
      });

      container.onFrame('a');
      container.onFrame('b');

      expect(stdout.get()).toBe('b');
      container.destroy();
    });
  });
});
