import ansiEscapes from 'ansi-escapes';
import { describe, expect, it } from 'vitest';
import { Container } from '../src/Container';
import { createStdin } from './helpers/create-stdin';
import { createStdout } from './helpers/create-stdout';

// Built from `String.fromCharCode` rather than a `\x1b`/`` literal so
// there's no ambiguity about whether the escape byte actually made it into
// this source file -- see the two control-character constants below.
const ESC = String.fromCharCode(27);
const showCursorEscape = `${ESC}[?25h`;
const hideCursorEscape = `${ESC}[?25l`;
const bracketedPasteEnable = `${ESC}[?2004h`;
const bracketedPasteDisable = `${ESC}[?2004l`;

function makeContainer(
  columns = 20,
  isTTY = true,
  // Mirrors `render.ts`'s own default detection (TTY-only -- CI is
  // orthogonal and covered separately in `test/non-interactive.test.ts`), so
  // every existing call here keeps testing the interactive path it was
  // written for. Overridable independently of `isTTY` for the one test below
  // that specifically targets the cursor-restore guard's own `isTTY` check
  // (`Container#destroy`), which is orthogonal to `interactive` and must
  // stay pinned even in a session that is interactive but non-TTY.
  interactive = isTTY,
) {
  const stdin = createStdin();
  const stdout = createStdout(columns, isTTY);
  const stderr = createStdout(columns, isTTY);
  const container = new Container({
    debug: false,
    exitOnCtrlC: true,
    interactive,
    stdin,
    stdout,
    stderr,
  });

  return { container, stdin, stdout, stderr };
}

/**
 * Unit tests for the two pieces of terminal state that live directly on
 * `Container` -- cursor positioning (backing `useCursor()`) and bracketed
 * paste mode (backing `usePaste()`). Exercised against the class directly,
 * bypassing Vue/the layout engine entirely: what's under test here is
 * `onFrame`/`onStatic`'s escape-sequence bookkeeping, not layout, so a
 * `Container` fed literal frame strings is the more precise (and more
 * deterministic) level to assert it at than a full `render()` + component
 * tree would be. `useCursor.test.ts`/`use-paste.test.ts` cover the hook
 * layer on top of this.
 */
describe('Container cursor positioning', () => {
  it('appends no escape sequence to a frame when no cursor position is set', () => {
    const { container, stdout } = makeContainer();

    container.onFrame('hello');

    expect(stdout.get()).toBe('hello');
  });

  it('appends cursorTo + show-cursor after the frame once a position is set', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 2, y: 0 });
    container.onFrame('ab');

    expect(stdout.get()).toBe('ab' + ansiEscapes.cursorTo(2) + showCursorEscape);
  });

  it('moves the cursor up from the bottom line when the position is on an earlier line', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa\nbb');

    expect(stdout.get()).toBe(
      'aa\nbb' + ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(0) + showCursorEscape,
    );
  });

  it('returns the cursor to the bottom line and hides it before erasing a frame that showed it', () => {
    // `Container` issues the return-to-bottom prefix, the erase, and the
    // new frame as three separate `stdout.write()` calls (the same
    // multi-write shape `onFrame` already used for erase+rewrite before
    // this task) -- so this asserts the tail of `getWrites()`, not the
    // single last write.
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa\nbb');

    const writesBefore = stdout.getWrites().length;

    container.setCursorPosition(undefined);
    container.onFrame('cc\ndd');

    // Cursor was left on row 0 (of 2) by the previous frame; returning to
    // the bottom means moving down 1 row before the usual erase + rewrite.
    expect(stdout.getWrites().slice(writesBefore)).toEqual([
      hideCursorEscape + ansiEscapes.cursorDown(1) + ansiEscapes.cursorTo(0),
      ansiEscapes.eraseLines(2),
      'cc\ndd',
    ]);
  });

  it('does not return the cursor to the bottom when it was never shown', () => {
    const { container, stdout } = makeContainer();

    container.onFrame('aa');
    const writesBefore = stdout.getWrites().length;

    container.onFrame('bb');

    // No return-to-bottom prefix write at all -- just the usual erase and rewrite.
    expect(stdout.getWrites().slice(writesBefore)).toEqual([
      ansiEscapes.eraseLines(1),
      'bb',
    ]);
  });

  it('clears cursor-shown bookkeeping after a <Static> flush, so the very next frame needs no return-to-bottom', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa');

    container.onStatic('static line');
    container.onFrame('bb');

    const lastWrite = stdout.getWrites().at(-1)!;
    // The position is still live (never cleared), so it still shows on the
    // new frame -- but with nothing to return to first, since the old
    // frame's cursor was erased away by the static flush, not walked back.
    expect(lastWrite.startsWith(hideCursorEscape)).toBe(false);
    expect(lastWrite).toBe('bb' + ansiEscapes.cursorTo(0) + showCursorEscape);
  });

  // `frameHeight` (derived from `screenLines.length`) and `cursorWasShown` are
  // independent -- an empty-string frame with an active cursor position leaves
  // the former `0` while the latter stays `true` (`onFrame`'s
  // `this.screenLines = frame ? lines : []` empties `screenLines` regardless of
  // the cursor). A version of `eraseFrameAndForgetCursor` that gated the
  // cursor-state reset on `frameHeight > 0` (as an earlier draft of that
  // extraction did) left `cursorWasShown`/`previousCursorPosition` stale after
  // the first `<Static>` flush following such a frame -- the *next* flush then
  // read that stale state and hide a cursor that was already hidden, with
  // no matching show in between.
  it('does not emit a second, spurious hide sequence from two <Static> flushes after an empty frame with an active cursor', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa');
    // frameHeight drops to 0 (screenLines is now []), but the cursor is
    // still live -- exactly the state described above.
    container.onFrame('');

    // The first flush legitimately hides the still-shown cursor -- that's
    // correct, not the bug -- and must leave nothing left to hide again.
    container.onStatic('first');

    const writesBeforeSecond = stdout.getWrites().length;
    container.onStatic('second');
    const writesSinceSecond = stdout.getWrites().slice(writesBeforeSecond);

    // Nothing shown the cursor again between the two flushes, so the second
    // one must write only its own text -- no hide-cursor/cursorTo prefix.
    expect(writesSinceSecond).toEqual(['second\n']);
  });
});

// `destroy()` must restore the cursor itself, directly -- not by relying on a
// future `onFrame`/`onStatic` call, since the mount teardown destroys the
// `Renderer` *before* calling `Container.destroy()`, latching a flag that would
// make any such future call a no-op. These assert `destroy()`'s own write,
// independent of the Renderer entirely (this suite never even schedules it).
describe('Container cursor teardown (destroy())', () => {
  it('returns the cursor to the bottom line and shows it again on destroy() if a position was active', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa\nbb');

    const writesBefore = stdout.getWrites().length;

    container.destroy();

    // Cursor was left on row 0 (of 2); destroy() must walk it back down to
    // the bottom line and explicitly show it again -- unlike the ordinary
    // return-to-bottom-before-erasing case, there is no subsequent frame to
    // reveal it, so destroy() has to do that part itself.
    expect(stdout.getWrites().slice(writesBefore)).toEqual([
      hideCursorEscape +
        ansiEscapes.cursorDown(1) +
        ansiEscapes.cursorTo(0) +
        showCursorEscape,
    ]);
  });

  it('writes nothing cursor-related on destroy() if no position was ever shown', () => {
    const { container, stdout } = makeContainer();

    container.onFrame('aa');
    const writesBefore = stdout.getWrites().length;

    container.destroy();

    expect(stdout.getWrites().slice(writesBefore)).toEqual([]);
  });

  it('does not restore the cursor on a non-TTY stdout', () => {
    // `interactive: true` forced despite `isTTY: false` -- isolates the
    // cursor-restore guard's own `isTTY` check from non-interactive mode's
    // separate (and separately tested, in `test/non-interactive.test.ts`)
    // final-frame-at-destroy behavior, which would otherwise also write here
    // and mask what this test exists to pin.
    const { container, stdout } = makeContainer(20, false, true);

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa\nbb');

    const writesBefore = stdout.getWrites().length;

    container.destroy();

    expect(stdout.getWrites().slice(writesBefore)).toEqual([]);
  });

  it('is idempotent: calling destroy() twice does not write the restore sequence twice', () => {
    const { container, stdout } = makeContainer();

    container.setCursorPosition({ x: 0, y: 0 });
    container.onFrame('aa\nbb');

    const writesBefore = stdout.getWrites().length;

    container.destroy();
    container.destroy();

    expect(stdout.getWrites().slice(writesBefore)).toHaveLength(1);
  });
});

describe('Container bracketed paste mode', () => {
  it('writes the enable sequence once for the first setBracketedPasteMode(true), not on subsequent calls', () => {
    const { container, stdout } = makeContainer();

    container.setBracketedPasteMode(true);
    container.setBracketedPasteMode(true);

    expect(stdout.getWrites().filter(w => w === bracketedPasteEnable)).toHaveLength(1);
  });

  it('writes the disable sequence only once the count returns to zero', () => {
    const { container, stdout } = makeContainer();

    container.setBracketedPasteMode(true);
    container.setBracketedPasteMode(true);
    container.setBracketedPasteMode(false);

    expect(stdout.getWrites()).not.toContain(bracketedPasteDisable);

    container.setBracketedPasteMode(false);

    expect(stdout.getWrites()).toContain(bracketedPasteDisable);
  });

  it('is a no-op past a count of zero', () => {
    const { container, stdout } = makeContainer();

    container.setBracketedPasteMode(false);

    // Nothing at all: constructing a `Container` writes nothing either --
    // see `describe('Container construction')` below.
    expect(stdout.getWrites()).toHaveLength(0);
  });

  it('does nothing on a non-TTY stdout', () => {
    const { container, stdout } = makeContainer(20, false);

    container.setBracketedPasteMode(true);

    expect(stdout.getWrites()).not.toContain(bracketedPasteEnable);
  });

  it('force-disables on destroy() if still enabled, so an abrupt unmount cannot leave it stuck on', () => {
    const { container, stdout } = makeContainer();

    container.setBracketedPasteMode(true);
    container.destroy();

    expect(stdout.getWrites()).toContain(bracketedPasteDisable);
  });

  it('does not write a disable sequence on destroy() if it was never enabled', () => {
    const { container, stdout } = makeContainer();

    container.destroy();

    expect(stdout.getWrites()).not.toContain(bracketedPasteDisable);
  });
});

/**
 * What a `Container` is allowed to do to a terminal it has just been handed.
 *
 * The answer is: measure it. It used to also wipe it -- the constructor called
 * `onResize()`, whose clear belongs to a *resize* -- so every mount threw away
 * whatever was on screen above it. That is wrong for anything mounting into a
 * terminal someone else was already using, and `pnpm dev` is now exactly that
 * case: it is the HMR server, so there is a mount per edit and the developer's
 * scrollback went with each one.
 *
 * ink is the oracle and never clears at mount either.
 */
describe('Container construction', () => {
  it('writes nothing to the terminal at all', () => {
    const { container, stdout } = makeContainer();

    expect(stdout.getWrites()).toEqual([]);

    container.destroy();
  });

  it('still sizes the renderer from the terminal it was handed', () => {
    const { container } = makeContainer(37);

    // The half of `onResize` the constructor does still need. A fix that
    // removed the call outright rather than splitting it would leave this at
    // the `Renderer`'s constructor-time 0.
    expect(container.renderer.width).toBe(37);
    expect(container.windowSize.value.columns).toBe(37);

    container.destroy();
  });

  it('clears on an actual resize, which is where the clear belongs', () => {
    const { container, stdout } = makeContainer();

    container.onResize();

    expect(stdout.getWrites().join('')).toContain(ansiEscapes.clearTerminal);

    container.destroy();
  });

  it('leaves the first frame where the cursor already was, with nothing erased before it', () => {
    const { container, stdout } = makeContainer();

    container.onFrame('first');

    // Not `toContain`: the whole write, so a stray erase or home sequence
    // ahead of the frame would fail rather than hide inside it.
    expect(stdout.getWrites()).toEqual(['first']);

    container.destroy();
  });
});
