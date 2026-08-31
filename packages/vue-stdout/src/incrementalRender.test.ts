import ansiEscapes from 'ansi-escapes';
import { describe, expect, it } from 'vitest';
import { buildIncrementalFrameWrite } from './incrementalRender';

const ESC = String.fromCharCode(27);
const showCursorEscape = `${ESC}[?25h`;

/**
 * Unit tests for the incremental strategy's own byte sequence.
 *
 * Deliberately narrow in scope: what this strategy is *for* -- leaving the
 * same screen the full repaint would, for any sequence of frames -- is not
 * a property any assertion on bytes can establish, and is tested where it
 * belongs, against a replayed screen buffer, in
 * `test/render-equivalence.test.ts`. What is worth pinning here is the
 * handful of decisions that are this module's own rather than the contract's:
 * which cases fall back to a full repaint, and that an unchanged line really
 * does cost nothing but a cursor move (otherwise the strategy has no reason
 * to exist, and the equivalence suite would happily pass a "diff" that
 * rewrote everything).
 */
describe('buildIncrementalFrameWrite', () => {
  describe('full-repaint fallbacks', () => {
    it('writes the frame whole when nothing is on screen to diff against', () => {
      expect(
        buildIncrementalFrameWrite({ frame: 'a\nb', previousLines: [] }),
      ).toBe('a\nb');
    });

    it('erases everything and writes nothing for an empty frame', () => {
      // Both strategies must agree that an empty frame leaves *nothing* on
      // screen rather than one blank row -- see this module's own comment.
      expect(
        buildIncrementalFrameWrite({ frame: '', previousLines: ['a', 'b', 'c'] }),
      ).toBe(ansiEscapes.eraseLines(3));
    });

    it('falls back for a frame that is exactly a newline, as ink does', () => {
      expect(
        buildIncrementalFrameWrite({ frame: '\n', previousLines: ['a', 'b'] }),
      ).toBe(ansiEscapes.eraseLines(2) + '\n');
    });
  });

  describe('the line walk', () => {
    it('steps over an unchanged line instead of rewriting it', () => {
      // Asserted as the whole exact sequence rather than as
      // `not.toContain('a')` / `not.toContain('c')`: those were
      // single-character substring checks over a string that is mostly
      // escape bytes, so they held only by luck of which letters the
      // fixture happened to use, and would misfire the moment an unrelated
      // sequence containing an `a` or a `c` entered the output.
      expect(
        buildIncrementalFrameWrite({
          frame: 'a\nCHANGED\nc',
          previousLines: ['a', 'b', 'c'],
        }),
      ).toBe(
        ansiEscapes.cursorUp(2) +
          // line 0 unchanged -- stepped over, not rewritten
          ansiEscapes.cursorNextLine +
          // line 1 rewritten in place
          ansiEscapes.cursorTo(0) +
          'CHANGED' +
          ansiEscapes.eraseEndLine +
          '\n' +
          // line 2 unchanged, and last: not stepped past, so the cursor
          // stays on the frame's bottom row
          '',
      );
    });

    it('erases to end of line after each rewritten line', () => {
      // Mandatory, not cosmetic: without it the tail of a longer previous
      // line survives to the right of its shorter replacement.
      const output = buildIncrementalFrameWrite({
        frame: 'aaaa\nbb',
        previousLines: ['aaaa', 'bbbbbbbb'],
      });

      expect(output).toContain(`bb${ansiEscapes.eraseEndLine}`);
    });

    it('writes nothing at all when every line is unchanged', () => {
      const output = buildIncrementalFrameWrite({
        frame: 'a\nb\nc',
        previousLines: ['a', 'b', 'c'],
      });

      // Cursor movement only -- up to the top, then back down over each
      // untouched row -- and never past the frame's bottom row, which is
      // where the next erase measures from.
      expect(output).toBe(
        ansiEscapes.cursorUp(2) + ansiEscapes.cursorNextLine + ansiEscapes.cursorNextLine,
      );
    });

    it('emits no cursor move at all rather than cursorUp(0) for a single-line previous frame', () => {
      // `ansi-escapes` does not clamp: `cursorUp(0)` is the literal
      // `ESC[0A`, and ECMA-48 defines a `0` parameter to CUU as meaning
      // ONE. Emitting it moves the cursor a row above the frame, and the
      // line walk then rewrites whatever is up there -- the bottom line of
      // a `<Static>` flush or of intercepted console output -- climbing a
      // row per commit. A one-line frame is what a spinner or a status line
      // renders every frame, so this is ordinary input, not a corner.
      const output = buildIncrementalFrameWrite({
        frame: 'v8',
        previousLines: ['v4'],
      });

      expect(output).not.toContain(`${ESC}[0A`);
      expect(output).toBe(ansiEscapes.cursorTo(0) + 'v8' + ansiEscapes.eraseEndLine);
    });

    it('erases the surplus rows when the frame shrinks, then returns to the top', () => {
      const output = buildIncrementalFrameWrite({
        frame: 'a\nb',
        previousLines: ['a', 'b', 'c', 'd'],
      });

      expect(output.startsWith(ansiEscapes.eraseLines(2) + ansiEscapes.cursorUp(2))).toBe(
        true,
      );
    });
  });

  it('parks the cursor via the shared suffix helper when useCursor() set a position', () => {
    const output = buildIncrementalFrameWrite({
      frame: 'a\nCHANGED',
      previousLines: ['a', 'b'],
      cursorPosition: { x: 2, y: 0 },
    });

    expect(output.endsWith(ansiEscapes.cursorUp(1) + ansiEscapes.cursorTo(2) + showCursorEscape)).toBe(
      true,
    );
  });

  it('writes fewer bytes than a full repaint when one line of a tall frame changes', () => {
    const build = (marker: string) =>
      Array.from({ length: 30 }, (_, i) =>
        i === 15 ? `${marker}-ticking-line` : `stable-line-${i}`,
      ).join('\n');

    const previous = build('a');
    const next = build('b');

    const incremental = buildIncrementalFrameWrite({
      frame: next,
      previousLines: previous.split('\n'),
    });
    const fullRepaint = ansiEscapes.eraseLines(30) + next;

    expect(incremental.length).toBeLessThan(fullRepaint.length);
  });
});
