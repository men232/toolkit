// Ported from a subset of ink's `src/cursor-helpers.ts`. Its
// `cursorPositionChanged`/`buildCursorOnlySequence` support ink's "output
// unchanged, only the cursor moved" fast path, which has nothing to attach to
// here: `Container#onFrame` is called only when there is a frame to commit.
import ansiEscapes from 'ansi-escapes';

/** A terminal cell position, relative to the top of the rendered output. Matches ink's `CursorPosition`. */
export interface CursorPosition {
  readonly x: number;
  readonly y: number;
}

const showCursorEscape = '[?25h';
const hideCursorEscape = '[?25l';

/**
 * Escape sequence to append right after a freshly written frame: moves the
 * cursor up from `bottomLine` (the row the write left it on -- always
 * `frame.split('\n').length - 1`, see ink's own doc comment on this
 * function) to `cursorPosition`, then shows it. Empty string when no
 * cursor position is set, leaving the cursor wherever the frame write left
 * it (unchanged from `Container`'s pre-`useCursor` behavior).
 */
export function buildCursorSuffix(
  bottomLine: number,
  cursorPosition: CursorPosition | undefined,
): string {
  if (!cursorPosition) {
    return '';
  }

  const moveUp = bottomLine - cursorPosition.y;
  return (
    (moveUp > 0 ? ansiEscapes.cursorUp(moveUp) : '') +
    ansiEscapes.cursorTo(cursorPosition.x) +
    showCursorEscape
  );
}

/**
 * Escape sequence to run *before* erasing the previous frame, when a prior
 * {@link buildCursorSuffix} call left the real terminal cursor somewhere
 * other than the bottom line: hides it, moves it down to the bottom line,
 * and returns it to column 0 -- `ansiEscapes.eraseLines` (what `Container`
 * erases the previous frame with) assumes the cursor starts there. Empty
 * string when the cursor was never shown, leaving `Container`'s existing
 * erase-then-rewrite behavior untouched.
 */
export function buildReturnToBottomPrefix(
  cursorWasShown: boolean,
  previousLineCount: number,
  previousCursorPosition: CursorPosition | undefined,
): string {
  if (!cursorWasShown || !previousCursorPosition) {
    return '';
  }

  const down = previousLineCount - 1 - previousCursorPosition.y;
  return (
    hideCursorEscape +
    (down > 0 ? ansiEscapes.cursorDown(down) : '') +
    ansiEscapes.cursorTo(0)
  );
}

/**
 * Escape sequence to run exactly once, on final teardown
 * (`Container.destroy()`), when the last frame written left the cursor
 * shown somewhere other than the terminal's own bottom-left: same
 * return-to-bottom move {@link buildReturnToBottomPrefix} does, but
 * followed by explicitly showing the cursor again -- unlike a live
 * `onFrame` call, there is no subsequent `buildCursorSuffix` coming to undo
 * `buildReturnToBottomPrefix`'s hide. Without this, an app that exits while
 * `useCursor` had an active position leaves the real terminal cursor
 * hidden and parked mid-frame, and the next thing written there (the
 * shell's own prompt) lands on top of the app's last output instead of
 * below it. Empty string when the cursor was never shown, leaving
 * `Container`'s teardown behavior unchanged for every app that never
 * calls `useCursor`.
 */
export function buildCursorTeardownSequence(
  cursorWasShown: boolean,
  previousLineCount: number,
  previousCursorPosition: CursorPosition | undefined,
): string {
  if (!cursorWasShown) {
    return '';
  }

  return (
    buildReturnToBottomPrefix(cursorWasShown, previousLineCount, previousCursorPosition) +
    showCursorEscape
  );
}
