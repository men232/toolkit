import chalk from 'chalk';
import stringWidth from 'string-width';
import { describe, expect, it } from 'vitest';
import { DOM } from './DOMTree';
import Layer, { FIRST_WIDE_CODE_UNIT } from './Layer';
import { Renderer } from './render';

/**
 * `Layer` memoises `tokenize`/`stringWidth`/`widestLine` (`LayerCaches`), and
 * the memo now survives `compute()` — two generations deep, so a line the last
 * frame drew is still there and a line nothing has drawn for two frames is not.
 * These tests exist to prove the memo *invalidates*, not that it hits: a cache
 * test that only asserts a hit passes just as happily against a cache that
 * never lets go of the first line it saw.
 *
 * Each one was seen red against a deliberately broken memo — keyed on
 * `line.length` instead of `line`, consulted before the transformer loop
 * instead of after, and (for the last case) rotated never rather than once per
 * frame.
 */
describe('Layer line memo', () => {
  const write = (layer: Layer, x: number, y: number, text: string) =>
    layer.write(x, y, text, { transformers: [] });

  /**
   * Reaches past two `private` markers on purpose. Retention is the whole risk
   * of holding this memo across frames — an unbounded version measured
   * +2 078 MB over 3 000 frames of fresh content — and nothing observable from
   * outside `Layer` distinguishes a bounded memo from a leaking one.
   */
  const memoSize = (layer: Layer): number => {
    const { caches } = layer as unknown as {
      caches: { styledChars: Map<string, unknown> };
    };

    return caches.styledChars.size;
  };

  it('renders a different line at the same position on a later frame', () => {
    const layer = new Layer({ width: 10, height: 1 });

    write(layer, 0, 0, 'aaa');
    layer.compute();
    expect(layer.frame).toBe('aaa');

    // Same `Layer` instance, same position, same length, different content:
    // a memo that survives the frame — or that keys on anything coarser than
    // the string itself — reprints `aaa` here.
    write(layer, 0, 0, 'bbb');
    layer.compute();
    expect(layer.frame).toBe('bbb');
  });

  it('distinguishes two same-length lines written in one frame', () => {
    const layer = new Layer({ width: 10, height: 2 });

    write(layer, 0, 0, 'abc');
    write(layer, 0, 1, 'xyz');
    layer.compute();

    expect(layer.frame).toBe('abc\nxyz');
  });

  it('keys on the transformed line, not the text it was written with', () => {
    const layer = new Layer({ width: 20, height: 2 });

    layer.write(0, 0, 'same', { transformers: [text => `${text}-one`] });
    layer.write(0, 1, 'same', { transformers: [text => `${text}-two`] });
    layer.compute();

    expect(layer.frame).toBe('same-one\nsame-two');
  });

  it('does not let a shared styled-char run mutate between write positions', () => {
    const layer = new Layer({ width: 12, height: 2 });

    // A full-width glyph makes `compute()` write a blank continuation cell
    // *beside* each character. That write must land in the grid, never in the
    // memoised character run shared by both rows.
    write(layer, 0, 0, '日本');
    write(layer, 4, 1, '日本');
    layer.compute();

    expect(layer.frame).toBe('日本\n    日本');
  });

  it('re-measures a clipped line whose content changed between frames', () => {
    const layer = new Layer({ width: 12, height: 1 });

    // The clip path is the only caller of the width memos.
    layer.clip({ x1: 0, x2: 4, y1: undefined, y2: undefined });
    write(layer, 0, 0, 'abcdefgh');
    layer.unclip();
    layer.compute();
    expect(layer.frame).toBe('abcd');

    layer.clip({ x1: 0, x2: 4, y1: undefined, y2: undefined });
    write(layer, 0, 0, 'ZYXWVUTS');
    layer.unclip();
    layer.compute();
    expect(layer.frame).toBe('ZYXW');
  });

  it('holds a line drawn on the previous frame but not one older than that', () => {
    const layer = new Layer({ width: 10, height: 1 });

    write(layer, 0, 0, 'first');
    layer.compute();
    expect(memoSize(layer)).toBe(0); // rotated out of `current`

    // Drawn again: served from the previous generation and promoted back, which
    // is what keeps a steady screen hitting forever.
    write(layer, 0, 0, 'first');
    layer.compute();

    // Two frames of something else, and `first` must be gone rather than
    // accumulating for the life of the process.
    write(layer, 0, 0, 'second');
    layer.compute();
    write(layer, 0, 0, 'third');
    layer.compute();

    const { caches } = layer as unknown as {
      caches: { previousStyledChars: Map<string, unknown> };
    };

    expect([...caches.previousStyledChars.keys()]).toEqual(['third']);
  });

  it('does not grow with the number of frames drawn', () => {
    const layer = new Layer({ width: 40, height: 1 });

    for (let frame = 0; frame < 200; frame++) {
      write(layer, 0, 0, `line ${frame}`);
      layer.compute();
    }

    const { caches } = layer as unknown as {
      caches: {
        styledChars: Map<string, unknown>;
        previousStyledChars: Map<string, unknown>;
      };
    };

    // One frame's worth in each generation, not 200 frames' worth.
    expect(caches.styledChars.size).toBe(0);
    expect(caches.previousStyledChars.size).toBe(1);
  });
});

/**
 * The write cursor's column advance, and the two repairs an overlapping write
 * needs at the edges of a wide glyph. Ported from ink 7.1.1 (`build/output.js`,
 * `Output#get`); every case below is asserted against the *string ink itself
 * produces* over in `test/parity/glyph-width.test.tsx`, so these unit cases
 * only have to pin the parts of the rule a rendered tree cannot easily reach —
 * a second write landing in the middle of a glyph the first one drew.
 *
 * The first four cases were seen red against the previous rule
 * (`character.fullWidth || character.value.length > 1 ? 2 : 1`, with no
 * boundary repairs at all). The last is a guard on a *condition* the repair
 * carries rather than on the repair itself, so it passes against the old rule
 * too; it was instead seen red against this rule with the empty-run bail
 * replaced by `false`.
 *
 * Deliberately absent: a case for the leading repair's third clause, that the
 * cell to the left really is wide. No sequence of writes reaches it — see the
 * note on that clause in `Layer.ts` — so a test for it could only ever be one
 * that has never been red.
 */
describe('Layer column advance', () => {
  const write = (layer: Layer, x: number, y: number, text: string) =>
    layer.write(x, y, text, { transformers: [] });

  it('advances one column for a narrow multi-code-point grapheme', () => {
    const layer = new Layer({ width: 20, height: 1 });

    // Two combining-mark graphemes: one column each, so the sibling written at
    // column 2 sits beside them rather than on top of the second one. Explicit
    // escapes, for the reason `test/parity/glyph-width.test.tsx` gives: a
    // literal 'a' + U+0301 in the source recomposes to a precomposed 'a' on
    // save, and the precomposed form does not reproduce the bug.
    const combining = 'a\u0301b\u0301';

    write(layer, 0, 0, combining);
    write(layer, 2, 0, 'x');
    layer.compute();

    expect(layer.frame).toBe(`${combining}x`);
  });

  it('advances one column for an astral-plane character', () => {
    const layer = new Layer({ width: 20, height: 1 });

    // A surrogate pair is two UTF-16 units and one column. The old rule read
    // `value.length`, so it charged two.
    write(layer, 0, 0, '𝕏𝕐');
    write(layer, 2, 0, 'x');
    layer.compute();

    expect(layer.frame).toBe('𝕏𝕐x');
  });

  it('blanks the leading half of a wide glyph a later write starts inside', () => {
    const layer = new Layer({ width: 10, height: 1 });

    // 'X' lands on the continuation cell of '日'. Without the repair the row
    // keeps '日' beside it and the terminal prints five columns of content
    // into four, shifting everything after it.
    write(layer, 0, 0, '日本');
    write(layer, 1, 0, 'X');
    layer.compute();

    expect(layer.frame).toBe(' X本');
  });

  it('blanks the trailing half of a wide glyph a later write ends inside', () => {
    const layer = new Layer({ width: 10, height: 1 });

    // 'abc' ends on the continuation cell of the styled '本', which carries
    // that glyph's styles -- left in place it emits a stray SGR run after the
    // line, which `trimEnd` cannot remove.
    write(layer, 0, 0, chalk.red('日本'));
    write(layer, 0, 0, 'abc');
    layer.compute();

    expect(layer.frame).toBe('abc');
  });

  /**
   * `SINGLE_UNIT_WIDTHS` seeds `1` for every code unit below
   * {@link FIRST_WIDE_CODE_UNIT} instead of measuring them, which is only
   * sound while `string-width` agrees. This re-runs the sweep that
   * established the boundary, so a dependency bump that moved it fails here
   * rather than silently mismeasuring most of the Latin alphabet.
   */
  it('measures every seeded code unit as one column, and none above the boundary', () => {
    const wider: string[] = [];

    for (let code = 0; code < FIRST_WIDE_CODE_UNIT; code++) {
      if (Math.max(1, stringWidth(String.fromCharCode(code))) !== 1) {
        wider.push(`U+${code.toString(16).toUpperCase().padStart(4, '0')}`);
      }
    }

    expect(wider).toEqual([]);

    // And the boundary is tight: the very first code unit above the seeded
    // range really is two columns, so the seed is not merely safe but exact.
    expect(
      Math.max(1, stringWidth(String.fromCharCode(FIRST_WIDE_CODE_UNIT))),
    ).toBe(2);
  });

  it('repairs nothing for a line clipped away to nothing', () => {
    const layer = new Layer({ width: 12, height: 1 });

    // An empty character run reaches the same loop. It must write nothing --
    // in particular it must not blank the wide glyph sitting to the left of
    // where it would have started.
    write(layer, 0, 0, '日本');
    layer.clip({ x1: 0, x2: 1, y1: undefined, y2: undefined });
    write(layer, 1, 0, 'ab');
    layer.unclip();
    layer.compute();

    expect(layer.frame).toBe('日本');
  });
});

/**
 * `compute()` reuses a row's serialised string when the row holds exactly the
 * cells it held last frame (`sameAsLastFrame`). `styledCharsToString` is the
 * most expensive thing left in a frame — it calls `diffAnsiCodes` per
 * character, three `Set` allocations each — so a TUI that repaints one line of
 * a full screen stops paying for the other fifty.
 *
 * The key is the row's **cell identity sequence**, which is the value itself,
 * not a revision number; the risk is therefore not a missed invalidation but a
 * comparison that is too weak, or grid state that leaks between frames. Every
 * case below was seen red against `sameAsLastFrame` reduced to its length
 * check, and again against a `compute()` that refills last frame's row arrays
 * instead of allocating new ones.
 *
 * Not covered by a red test, and not claimed to be: truncating `previousRows`
 * to the frame's height. A row beyond the current height is never consulted,
 * and a row that grows back is compared cell by cell like any other, so the
 * truncation bounds memory rather than preventing a stale hit.
 */
describe('Layer row memo', () => {
  const write = (layer: Layer, x: number, y: number, text: string) =>
    layer.write(x, y, text, { transformers: [] });

  it('reprints a row that lost its content', () => {
    const layer = new Layer({ width: 10, height: 1 });

    write(layer, 0, 0, 'hello');
    layer.compute();
    expect(layer.frame).toBe('hello');

    // Nothing written at all: the grid is rebuilt blank every frame, so the row
    // must come back empty rather than keeping what it last showed.
    layer.compute();
    expect(layer.frame).toBe('');
  });

  it('reprints a row whose content moved to another column', () => {
    const layer = new Layer({ width: 10, height: 1 });

    write(layer, 0, 0, 'hi');
    layer.compute();
    expect(layer.frame).toBe('hi');

    // Same characters, same count, same row — different cells.
    write(layer, 3, 0, 'hi');
    layer.compute();
    expect(layer.frame).toBe('   hi');
  });

  it('reprints a row whose styling changed but whose text did not', () => {
    const layer = new Layer({ width: 10, height: 1 });

    write(layer, 0, 0, chalk.red('hi'));
    layer.compute();
    const red = layer.frame;

    write(layer, 0, 0, chalk.green('hi'));
    layer.compute();

    expect(layer.frame).not.toBe(red);
    expect(layer.frame).toBe(chalk.green('hi'));
  });

  it('reprints a row whose transformer changed', () => {
    const layer = new Layer({ width: 20, height: 1 });

    layer.write(0, 0, 'same', { transformers: [text => `${text}-one`] });
    layer.compute();
    expect(layer.frame).toBe('same-one');

    // The row memo sits downstream of the transformer loop, as the line memo
    // does: the cells come from the transformed string.
    layer.write(0, 0, 'same', { transformers: [text => `${text}-two`] });
    layer.compute();
    expect(layer.frame).toBe('same-two');
  });

  it('reprints a row whose wide glyph changed', () => {
    const layer = new Layer({ width: 12, height: 1 });

    write(layer, 0, 0, '日本');
    layer.compute();
    expect(layer.frame).toBe('日本');

    // Same column count, same continuation-cell shape, different glyphs.
    write(layer, 0, 0, '中国');
    layer.compute();
    expect(layer.frame).toBe('中国');
  });

  it('reprints a row whose clip changed what it shows', () => {
    const layer = new Layer({ width: 12, height: 1 });

    layer.clip({ x1: 0, x2: 4, y1: undefined, y2: undefined });
    write(layer, 0, 0, 'abcdefgh');
    layer.unclip();
    layer.compute();
    expect(layer.frame).toBe('abcd');

    layer.clip({ x1: 0, x2: 6, y1: undefined, y2: undefined });
    write(layer, 0, 0, 'abcdefgh');
    layer.unclip();
    layer.compute();
    expect(layer.frame).toBe('abcdef');
  });

  it('reprints only the row that changed, through a real Renderer', () => {
    const document = DOM.Document.createDocument();
    const root = DOM.createElement('stdout-box');
    root.setAttribute('flexDirection', 'column');

    const rows = [0, 1, 2].map(index => {
      const label = DOM.createElement('stdout-text');
      const runs = DOM.createTextNode(`row ${index}`);
      label.appendChild(runs);
      root.appendChild(label);
      return runs;
    });

    document.appendChild(root);

    // `Renderer` is the only path that reuses one `Layer` across frames --
    // `renderToFrame` allocates a fresh one -- so it is the only place the row
    // memo is live at all.
    const renderer = new Renderer({ document, width: 20, height: 10 });

    expect(renderer.render()).toBe('row 0\nrow 1\nrow 2');

    rows[1]!.textValue = 'CHANGED';
    expect(renderer.render()).toBe('row 0\nCHANGED\nrow 2');

    rows[1]!.textValue = 'row 1';
    expect(renderer.render()).toBe('row 0\nrow 1\nrow 2');

    renderer.destroy();
  });
});
