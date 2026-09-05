import ansiEscapes from 'ansi-escapes';
import { type CursorPosition, buildCursorSuffix } from './cursorHelpers';

/**
 * The second of `Container`'s two rendering strategies: repaint only the
 * lines that actually changed, instead of erasing the whole previous frame
 * and writing the new one out in full.
 *
 * Ported from `createIncremental` in ink's `src/log-update.ts`, with two
 * deliberate differences, both because `Container` is shaped differently
 * from ink's `log-update`:
 *
 * 1. No "output unchanged, only the cursor moved" fast path. ink needs one
 *    because its `logUpdate` decides whether to write at all;
 *    `Container#onFrame` is called only when there is a frame to commit.
 * 2. An empty frame falls back to the full repaint. ink's incremental path
 *    would leave one blank row behind and go on believing a one-line frame
 *    is on screen, but `Container` treats an empty frame as nothing on
 *    screen at all (`frameHeight` 0) -- the two strategies have to agree on
 *    that or their *state* diverges even where their pixels do not.
 *
 * A pure function over an explicit `previousLines` rather than a stateful
 * renderer with its own baseline: owning no copy, it cannot hold a stale one
 * when something else writes to the terminal. See `Container#screenLines`.
 */
export interface IncrementalFrameWriteOptions {
  /** The frame to put on screen. */
  frame: string;
  /**
   * The lines currently on screen -- `frame.split('\n')` of whatever was
   * last written there, or empty when the terminal holds nothing this
   * renderer owns (a fresh start, or right after a `<Static>` flush,
   * `console.log`, resize or `clear()` erased it).
   */
  previousLines: readonly string[];
  /** Where to park the real terminal cursor afterwards, if `useCursor()` set one. */
  cursorPosition?: CursorPosition | undefined;
}

/**
 * Count the rows a frame actually occupies. `split('\n')` yields a trailing
 * empty element for a string ending in a newline; that element is a cursor
 * position, not a visible line. Matches ink's `visibleLineCount`.
 */
function visibleLineCount(lines: readonly string[], text: string): number {
  return text.endsWith('\n') ? lines.length - 1 : lines.length;
}

/**
 * `ansiEscapes.cursorUp`, but a distance of zero emits nothing at all.
 *
 * `ansi-escapes` does no clamping: `cursorUp(0)` emits `ESC[0A`, and ECMA-48
 * defines a `0` parameter to CUU as meaning **one** -- xterm, VTE and iTerm
 * all move up a row for it. So the sequence a naive reader takes for "stay
 * put" is the one that must never be sent: it walks the cursor above the
 * frame, and the line walk below then overwrites whatever is there (a
 * `<Static>` flush's bottom line, say) one row higher on every commit.
 *
 * Reachable from ordinary input: a single-line frame with no trailing
 * newline makes `previousLines.length - 1` exactly zero, which is what a
 * spinner or one-line status app renders every frame.
 */
function cursorUp(rows: number): string {
  return rows > 0 ? ansiEscapes.cursorUp(rows) : '';
}

/**
 * Build the bytes that turn `previousLines` into `frame` on screen.
 *
 * Preconditions, both guaranteed by the only caller (`Container#onFrame`):
 * the cursor sits on the **last row** of the previous frame (any column),
 * and `previousLines` describes exactly what is on those rows.
 *
 * The returned string is a single write, as ink also buffers its chunks: a
 * frame that reached the terminal in a dozen writes can be torn by anything
 * else writing in between.
 */
export function buildIncrementalFrameWrite({
  frame,
  previousLines,
  cursorPosition,
}: IncrementalFrameWriteOptions): string {
  const nextLines = frame.split('\n');

  // Full repaint in the three cases with nothing worth diffing: nothing on
  // screen (the line walk would emit a `cursorTo(0)`+`eraseEndLine` per line
  // to say what one plain write says), an empty frame (see this module's
  // comment -- both strategies must agree it leaves *nothing* on screen, not
  // one blank row), and a lone newline, which ink special-cases too.
  if (previousLines.length === 0 || frame === '' || frame === '\n') {
    return (
      ansiEscapes.eraseLines(previousLines.length) +
      frame +
      buildCursorSuffix(nextLines.length - 1, cursorPosition)
    );
  }

  const hasTrailingNewline = frame.endsWith('\n');
  const visibleCount = visibleLineCount(nextLines, frame);

  // `visibleLineCount` asked of the previous frame, but answered from its
  // lines rather than its text -- a trailing empty element is what a trailing
  // newline splits to, so `Container` need not keep the old string too.
  const previousHadTrailingNewline = previousLines.at(-1) === '';
  const previousVisible = previousHadTrailingNewline
    ? previousLines.length - 1
    : previousLines.length;

  const buffer: string[] = [];

  // Step 1 -- get the cursor to the first row of the frame, having erased
  // any rows the new frame no longer covers.
  if (visibleCount < previousVisible) {
    // The frame shrank: erase the surplus rows on the way up. The extra
    // slot accounts for the cursor row a trailing newline leaves below the
    // previous frame's last visible line.
    const extraSlot = previousHadTrailingNewline ? 1 : 0;
    buffer.push(
      ansiEscapes.eraseLines(previousVisible - visibleCount + extraSlot),
      cursorUp(visibleCount),
    );
  } else {
    // Same height or taller: nothing to erase, just walk back up to the
    // top. `previousLines.length - 1` (not `previousVisible - 1`) is the
    // cursor's real row offset -- with a trailing newline it is parked one
    // row below the last visible line.
    buffer.push(cursorUp(previousLines.length - 1));
  }

  // Step 2 -- walk the lines, writing only the ones that differ. Every
  // iteration begins with the cursor on the row for line `i`.
  for (let i = 0; i < visibleCount; i++) {
    const isLastLine = i === visibleCount - 1;

    if (nextLines[i] === previousLines[i]) {
      // Untouched: step over it, writing nothing. Not stepping past the last
      // line of a frame with no trailing newline keeps the cursor on the
      // bottom row -- where the full repaint also leaves it, and what every
      // later erase measures from.
      if (!isLastLine || hasTrailingNewline) {
        buffer.push(ansiEscapes.cursorNextLine);
      }

      continue;
    }

    buffer.push(
      ansiEscapes.cursorTo(0) +
        nextLines[i] +
        // Mandatory, not cosmetic: the new line can be shorter than the one
        // it replaces, and without this the tail of the old one survives
        // to the right of it.
        ansiEscapes.eraseEndLine +
        (isLastLine && !hasTrailingNewline ? '' : '\n'),
    );
  }

  buffer.push(buildCursorSuffix(nextLines.length - 1, cursorPosition));

  return buffer.join('');
}
