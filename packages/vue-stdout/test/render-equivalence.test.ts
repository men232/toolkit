/* eslint-disable no-console */
import { describe, expect, it, vi } from 'vitest';
import { h, nextTick, ref } from 'vue';
import { Container } from '../src/Container';
import { Static } from '../src/components/Static';
import { createApp } from '../src/createApp';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';
import { reconstructTerminalScreen } from './helpers/terminal';

/**
 * `Container` now has two ways to put a frame on the terminal: the original
 * full repaint (erase every line of the previous frame, write the new one
 * whole) and the incremental one added here (`src/incrementalRender.ts` --
 * walk the lines and rewrite only those that differ). They emit deliberately
 * *different* bytes. The contract that makes the second one safe to turn on
 * is that those different bytes leave the user looking at the same thing.
 *
 * So none of these tests assert on bytes. Each drives the same sequence of
 * steps through both strategies, replays each strategy's writes against a
 * screen buffer (`test/helpers/terminal.ts`), and asserts the two screens
 * match -- *after every step*, not only at the end, so a strategy that
 * corrupts the screen and then happens to repair itself on the next frame
 * still fails here.
 */

type Step =
  | { kind: 'frame'; frame: string }
  | { kind: 'static'; text: string }
  | { kind: 'log'; text: string }
  | { kind: 'clear' };

const frame = (text: string): Step => ({ kind: 'frame', frame: text });
const staticFlush = (text: string): Step => ({ kind: 'static', text });
const log = (text: string): Step => ({ kind: 'log', text });
const clear = (): Step => ({ kind: 'clear' });

/**
 * Drives `steps` through a `Container` in one strategy and returns the
 * screen as it stood after each step.
 *
 * A `Container` fed literal frames, rather than a mounted component tree, is
 * the precise level for this: what is under test is the erase/cursor/write
 * bookkeeping the two strategies differ in, not layout. The throttling and
 * `<Static>` cases further down do go through the full `render()` stack,
 * because what they are about is precisely the interaction with the layers
 * above `onFrame`.
 */
function runSteps(
  steps: Step[],
  incrementalRendering: boolean,
  alternateScreen = false,
): string[][] {
  const stdout = createStdout(40);
  const container = new Container({
    debug: false,
    exitOnCtrlC: true,
    interactive: true,
    incrementalRendering,
    alternateScreen,
    // Needed only by the `log` steps; harmless (and restored by `destroy()`)
    // for every other case.
    patchConsole: true,
    stdin: createStdin(),
    stdout,
    stderr: createStdout(40, false),
  });

  const screens: string[][] = [];

  try {
    for (const step of steps) {
      switch (step.kind) {
        case 'frame':
          container.onFrame(step.frame);
          break;
        case 'static':
          container.onStatic(step.text);
          break;
        case 'log':
          console.log(step.text);
          break;
        case 'clear':
          container.clear();
          break;
      }

      screens.push(reconstructTerminalScreen(stdout.getWrites().join('')));
    }
  } finally {
    container.destroy();
  }

  return screens;
}

/**
 * Assert both strategies agree, and -- separately -- that the full repaint
 * really showed what the case claims it should. Equivalence alone is a
 * weaker property than it looks: two strategies that both render nothing
 * are perfectly equivalent. Pinning the expected screen as well means a
 * case cannot pass by both sides being equally broken.
 *
 * `expectedScreens` pins the screen after **every** step, not just the last
 * one. Pinning only the final screen would let a step both strategies got
 * equally wrong in the middle of a sequence sail through on a correct
 * ending -- and the intermediate screens are where the interesting states
 * live here: a frame erased down to nothing, a `<Static>` flush sitting
 * alone before its paired frame lands under it.
 */
function expectEquivalent(
  steps: Step[],
  expectedScreens: string[][],
  alternateScreen = false,
): void {
  const full = runSteps(steps, false, alternateScreen);
  const incremental = runSteps(steps, true, alternateScreen);

  expect(incremental).toEqual(full);
  expect(full).toEqual(expectedScreens);
}

describe('full repaint vs incremental rendering: the same frames leave the same screen', () => {
  it('the frame grows', () => {
    expectEquivalent(
      [frame('a\nb'), frame('a\nb\nc')],
      [
        ['a', 'b'],
        ['a', 'b', 'c'],
      ],
    );
  });

  it('the frame grows past the previous frame with every existing line changed too', () => {
    expectEquivalent(
      [frame('a\nb'), frame('x\ny\nz\nw')],
      [
        ['a', 'b'],
        ['x', 'y', 'z', 'w'],
      ],
    );
  });

  it('the frame shrinks', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame('a\nb')],
      [
        ['a', 'b', 'c'],
        ['a', 'b'],
      ],
    );
  });

  it('the frame shrinks to a single line', () => {
    expectEquivalent(
      [frame('a\nb\nc\nd'), frame('only')],
      [['a', 'b', 'c', 'd'], ['only']],
    );
  });

  it('a line in the middle changes', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame('a\nMIDDLE\nc')],
      [
        ['a', 'b', 'c'],
        ['a', 'MIDDLE', 'c'],
      ],
    );
  });

  it('the first line changes', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame('FIRST\nb\nc')],
      [
        ['a', 'b', 'c'],
        ['FIRST', 'b', 'c'],
      ],
    );
  });

  it('the last line changes', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame('a\nb\nLAST')],
      [
        ['a', 'b', 'c'],
        ['a', 'b', 'LAST'],
      ],
    );
  });

  it('nothing changes at all', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame('a\nb\nc')],
      [
        ['a', 'b', 'c'],
        ['a', 'b', 'c'],
      ],
    );
  });

  it('the frame becomes empty', () => {
    expectEquivalent([frame('a\nb\nc'), frame('')], [['a', 'b', 'c'], []]);
  });

  it('the frame becomes empty and then comes back', () => {
    expectEquivalent(
      [frame('a\nb\nc'), frame(''), frame('d\ne')],
      [['a', 'b', 'c'], [], ['d', 'e']],
    );
  });

  it('the very first frame is empty', () => {
    expectEquivalent([frame(''), frame('a\nb')], [[], ['a', 'b']]);
  });

  it('a changed line gets shorter -- the tail of the old line must not survive', () => {
    // The one case a naive "overwrite the line in place" diff gets wrong:
    // writing `bb` over `bbbbbbbb` leaves `bbbbbb` behind unless the write
    // is followed by an erase-to-end-of-line.
    expectEquivalent(
      [frame('aaaaaaaa\nbbbbbbbb\ncccccccc'), frame('aaaaaaaa\nbb\ncccccccc')],
      [
        ['aaaaaaaa', 'bbbbbbbb', 'cccccccc'],
        ['aaaaaaaa', 'bb', 'cccccccc'],
      ],
    );
  });

  it('a changed line becomes empty while the lines around it stay', () => {
    expectEquivalent(
      [frame('a\nbbbb\nc'), frame('a\n\nc')],
      [
        ['a', 'bbbb', 'c'],
        ['a', '', 'c'],
      ],
    );
  });

  // `Layer` never produces a trailing newline today (`src/tree/Layer.ts`
  // joins its rows), but `onFrame` is public and the incremental walk has
  // explicit trailing-newline handling ported from ink: the trailing empty
  // element `split('\n')` produces is a cursor row, not a visible line, and
  // every count in the walk has to know the difference. Pinned here rather
  // than rested on "can't happen" -- the shrink case in particular is the
  // only thing that exercises the surplus-erase's extra slot.
  describe('frames with a trailing newline', () => {
    it('keeps its height', () => {
      expectEquivalent(
        [frame('a\nb\n'), frame('a\nc\n')],
        [
          ['a', 'b'],
          ['a', 'c'],
        ],
      );
    });

    it('shrinks', () => {
      expectEquivalent(
        [frame('a\nb\nc\n'), frame('a\n')],
        [['a', 'b', 'c'], ['a']],
      );
    });

    it('grows', () => {
      expectEquivalent(
        [frame('a\n'), frame('a\nb\nc\n')],
        [['a'], ['a', 'b', 'c']],
      );
    });

    it('gains and loses its trailing newline between frames', () => {
      expectEquivalent(
        [frame('a\nb\nc'), frame('a\nb\n'), frame('a\nb\nc')],
        [
          ['a', 'b', 'c'],
          ['a', 'b'],
          ['a', 'b', 'c'],
        ],
      );
    });
  });

  it('a long, mixed sequence of every shape in a row', () => {
    expectEquivalent(
      [
        frame('one'),
        frame('one\ntwo'),
        frame('one\ntwo\nthree'),
        frame('ONE\ntwo\nthree'),
        frame('ONE\nTWO\nthree'),
        frame('ONE\nTWO\nthree'),
        frame('ONE\nTWO'),
        frame(''),
        frame('back\nagain\nwith\nmore\nlines'),
        frame('back\nagain'),
      ],
      [
        ['one'],
        ['one', 'two'],
        ['one', 'two', 'three'],
        ['ONE', 'two', 'three'],
        ['ONE', 'TWO', 'three'],
        ['ONE', 'TWO', 'three'],
        ['ONE', 'TWO'],
        [],
        ['back', 'again', 'with', 'more', 'lines'],
        ['back', 'again'],
      ],
    );
  });

  describe('the diff baseline must account for output this renderer does not own', () => {
    it('a <Static> flush between frames', () => {
      // `onStatic` erases the frame and scrolls permanent content into
      // history. Whatever the incremental strategy believed was on screen is
      // no longer there -- diffing against it afterwards would rewrite only
      // the lines that "changed" and leave the rest of the frame missing.
      expectEquivalent(
        [
          frame('a\nb\nc'),
          staticFlush('permanent one'),
          frame('a\nb\nc'),
          staticFlush('permanent two'),
          frame('a\nCHANGED\nc'),
        ],
        [
          ['a', 'b', 'c'],
          // The flush erased the frame and put permanent content in its
          // place -- the frame is genuinely absent at this instant, which
          // is a state only a per-step assertion can see.
          ['permanent one'],
          ['permanent one', 'a', 'b', 'c'],
          ['permanent one', 'permanent two'],
          ['permanent one', 'permanent two', 'a', 'CHANGED', 'c'],
        ],
      );
    });

    it('a single-line frame below scrolled static output', () => {
      // The shape every other case in this file missed. A one-line previous
      // frame makes the walk-back-to-the-top move `cursorUp(0)` -- and
      // ECMA-48 clamps a `0` parameter to *one*, so an unguarded emit moves
      // the cursor a row above the frame and the line walk rewrites the
      // bottom line of the permanent output sitting there. Only reachable
      // when something has scrolled content in above the frame, which is
      // why the static/console cases either side of this one -- both with
      // three-line frames -- never caught it.
      expectEquivalent(
        [staticFlush('permanent'), frame('one'), frame('two'), frame('three')],
        [
          ['permanent'],
          ['permanent', 'one'],
          // `permanent` must still be on the row above -- an unguarded
          // `cursorUp(0)` overwrites it here, and again on the next step.
          ['permanent', 'two'],
          ['permanent', 'three'],
        ],
      );
    });

    it('a console.log between frames', () => {
      expectEquivalent(
        [
          frame('a\nb\nc'),
          log('MARKER'),
          frame('a\nb\nc'),
          frame('a\nb\nCHANGED'),
        ],
        [
          ['a', 'b', 'c'],
          ['MARKER', 'a', 'b', 'c'],
          ['MARKER', 'a', 'b', 'c'],
          ['MARKER', 'a', 'b', 'CHANGED'],
        ],
      );
    });

    it('a console.log with an unchanged frame either side', () => {
      // The nastiest ordering for a diff: the frame text is identical
      // before and after the foreign write, so a baseline that still
      // believed the old frame was on screen would emit *nothing* and leave
      // the console output with a hole where the frame should be.
      expectEquivalent(
        [frame('a\nb\nc'), log('MARKER')],
        [
          ['a', 'b', 'c'],
          ['MARKER', 'a', 'b', 'c'],
        ],
      );
    });

    it('an app.clear() between two identical frames', () => {
      // `clear()` wipes the screen out from under both strategies. The
      // frame that follows is byte-identical to the one before, so an
      // incremental baseline that survived the clear would decide there was
      // nothing to write and leave the terminal blank.
      expectEquivalent(
        [frame('a\nb\nc'), clear(), frame('a\nb\nc')],
        [['a', 'b', 'c'], [], ['a', 'b', 'c']],
      );
    });
  });

  describe('alternateScreen', () => {
    // `incrementalRendering` was never exercised together with
    // `alternateScreen`, which did not exist when the rest of this suite was
    // written. `reconstructTerminalLines` (`test/helpers/
    // terminal.ts`) already ignores every private-mode escape sequence
    // (`params.startsWith('?')`) -- which is exactly what
    // `enterAlternativeScreen`/`exitAlternativeScreen`/cursor-hide-and-show
    // are -- so the one-time entry sequence `Container`'s constructor writes
    // is invisible to the screen reducer and this is a straight rerun of an
    // existing shape, just with the option on.
    it('a mixed sequence still leaves the same screen with the alternate buffer entered', () => {
      expectEquivalent(
        [
          frame('a\nb\nc'),
          staticFlush('permanent'),
          frame('a\nCHANGED\nc'),
          frame('a\nCHANGED\nc'),
          frame('x\ny'),
        ],
        [
          ['a', 'b', 'c'],
          ['permanent'],
          ['permanent', 'a', 'CHANGED', 'c'],
          ['permanent', 'a', 'CHANGED', 'c'],
          ['permanent', 'x', 'y'],
        ],
        true,
      );
    });
  });
});

describe('full repaint vs incremental rendering: through the real render() stack', () => {
  const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
  const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);
  const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

  /**
   * Runs the same reactive scenario through `render()` in one strategy and
   * returns the resulting screen. `maxFps` is passed through untouched so
   * the throttling case below gets frames genuinely coalesced away.
   */
  async function runApp(
    incrementalRendering: boolean,
    maxFps: number,
    drive: (
      label: { value: string },
      items: { value: string[] },
    ) => Promise<void>,
  ): Promise<string[]> {
    const stdout = createStdout(40);
    const label = ref('0');
    const items = ref<string[]>([]);

    const app = createApp({
      render: () =>
        box(
          {},
          h(
            Static,
            { items: items.value },
            {
              default: ({ item }: { item: string }) =>
                span({ key: item }, item),
            },
          ),
          span({}, label.value),
        ),
    });
    app.mount({ stdout, maxFps, incrementalRendering, patchConsole: false });

    await flush();
    await drive(label, items);
    app.unmount();

    return reconstructTerminalScreen(stdout.getWrites().join(''));
  }

  it('a throttled burst: frames the throttle drops must not desync the diff baseline', async () => {
    // The hazard this case exists for. With `maxFps` active, most of the
    // updates below never become a frame at all -- the throttle skips the
    // pass -- and the ones that do are separated by a whole window. If the
    // incremental strategy updated its "what is currently on screen" model
    // anywhere other than at the write, it would diff the next real write
    // against a frame nobody ever saw, and skip writing every line the two
    // happen to share -- painting corruption only under load.
    //
    // Equivalence with the full repaint under the exact same throttle is
    // what pins it: the throttle is upstream of both strategies, so it skips
    // exactly the same passes for each and any divergence here is theirs.
    vi.useFakeTimers();
    try {
      const drive = async (label: { value: string }) => {
        // `Date` is frozen under fake timers, so every one of these lands
        // inside the mount frame's own throttle window and is coalesced
        // away; only the trailing commit survives.
        for (let i = 1; i <= 8; i++) {
          label.value = `value-${i}`;
          await nextTick();
          await flush();
        }

        vi.advanceTimersByTime(50);
        await flush();

        // A second burst, now that the window has closed and reopened.
        for (let i = 9; i <= 16; i++) {
          label.value = `value-${i}`;
          await nextTick();
          await flush();
        }
      };

      const full = await runApp(false, 30, drive);
      const incremental = await runApp(true, 30, drive);

      expect(incremental).toEqual(full);
      expect(full).toEqual(['value-16']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('a throttled burst interleaved with <Static> flushes and console output', async () => {
    vi.useFakeTimers();
    try {
      const drive = async (
        label: { value: string },
        items: { value: string[] },
      ) => {
        for (let i = 1; i <= 4; i++) {
          label.value = `v${i}`;
          await nextTick();
          await flush();
        }

        // Mid-throttle: `<Static>` bypasses the window outright, so this
        // computes and commits a frame alongside the static write (see
        // `Container#canComputeFrame`).
        items.value = [...items.value, 'first'];
        await nextTick();
        await flush();

        for (let i = 5; i <= 8; i++) {
          label.value = `v${i}`;
          await nextTick();
          await flush();
        }

        items.value = [...items.value, 'second'];
        await nextTick();
        await flush();

        vi.advanceTimersByTime(50);
        await flush();
      };

      const full = await runApp(false, 30, drive);
      const incremental = await runApp(true, 30, drive);

      expect(incremental).toEqual(full);
      expect(full).toEqual(['first', 'second', 'v8']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('unthrottled (maxFps: 0), where every single frame reaches the terminal', async () => {
    const drive = async (label: { value: string }) => {
      for (const value of ['aa', 'bb', 'cc', 'dd', 'ee']) {
        label.value = value;
        await nextTick();
        await flush();
      }
    };

    const full = await runApp(false, 0, drive);
    const incremental = await runApp(true, 0, drive);

    expect(incremental).toEqual(full);
    expect(full).toEqual(['ee']);
  });
});

describe('incrementalRendering option', () => {
  it('defaults to off -- the full repaint stays the default strategy, as in ink', () => {
    const stdout = createStdout(20);
    const container = new Container({
      debug: false,
      exitOnCtrlC: true,
      interactive: true,
      stdin: createStdin(),
      stdout,
      stderr: createStdout(20, false),
    });

    container.onFrame('a\nb');
    container.onFrame('a\nc');

    // The full repaint writes the frame verbatim as its own write; the
    // incremental strategy never does (it writes one buffer of interleaved
    // cursor moves and line fragments).
    expect(stdout.get()).toBe('a\nc');

    container.destroy();
  });

  it('writes a genuinely smaller payload when a single line of a tall frame changes', () => {
    // Not the contract (the screen is), but the reason the strategy exists:
    // if it wrote as much as the full repaint, there would be nothing to
    // turn on. Kept coarse -- a byte count, not a byte sequence -- so it
    // pins the property without pinning the implementation.
    const build = (marker: string) =>
      Array.from({ length: 20 }, (_, i) =>
        i === 10 ? `${marker}-changing-line` : `stable-line-${i}`,
      ).join('\n');

    const bytesWritten = (incrementalRendering: boolean) => {
      const stdout = createStdout(40);
      const container = new Container({
        debug: false,
        exitOnCtrlC: true,
        interactive: true,
        incrementalRendering,
        stdin: createStdin(),
        stdout,
        stderr: createStdout(40, false),
      });

      container.onFrame(build('a'));
      const before = stdout.getWrites().join('').length;
      container.onFrame(build('b'));
      const after = stdout.getWrites().join('').length;
      container.destroy();

      return after - before;
    };

    expect(bytesWritten(true)).toBeLessThan(bytesWritten(false));
  });
});
