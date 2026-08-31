import {
  type StyledChar,
  styledCharsFromTokens,
  styledCharsToString,
  tokenize,
} from '@alcalzone/ansi-tokenize';
import sliceAnsi from 'slice-ansi';
import stringWidth from 'string-width';
import widestLine from 'widest-line';

export type OutputTransformer = (s: string, index: number) => string;

/**
 * "Virtual" output: positions and stores each tree node's output, applies
 * per-character transformations, and produces the final frame string before
 * anything is written to a real stream.
 */

type Options = {
  width: number;
  height: number;
};

type Operation = WriteOperation | ClipOperation | UnclipOperation;

type WriteOperation = {
  type: 'write';
  x: number;
  y: number;
  text: string;
  transformers: OutputTransformer[];
};

type ClipOperation = {
  type: 'clip';
  clip: Clip;
};

type Clip = {
  x1: number | undefined;
  x2: number | undefined;
  y1: number | undefined;
  y2: number | undefined;
};

type UnclipOperation = {
  type: 'unclip';
};

/**
 * Memo for the three pure `string -> value` functions `compute()` calls in its
 * hot loop, held **across frames**. Ink's equivalent (`OutputCaches`,
 * `ink/build/output.js`) lives one frame and structurally cannot live longer —
 * ink allocates a fresh `Output` per frame, where `Renderer` reuses one
 * `Layer`. A TUI redraws mostly the same screen many times a second, so this is
 * the difference between tokenising every visible line every frame and
 * tokenising it once.
 *
 * ## Why it can never go stale
 *
 * Each entry is keyed by the **exact string** it was derived from, and each
 * value is a pure function of that string alone: `tokenize` parses SGR codes out
 * of it, `stringWidth`/`widestLine` count its columns. No entry depends on the
 * tree, the layout, the clip stack, the write position or the frame. A different
 * line is a different key. **There is no input to invalidate on** — which is why
 * this one is safe to hold across frames, where a memo keyed on a frame
 * generation would not be. See
 * [gotchas](../../.agents/docs/gotchas.md#the-invalidation-contract-for-render-caches).
 *
 * The key must be the **post-transformer** line (`paintText` hands `Layer` a
 * `transformers` array that rewrites the string per row), which is why
 * `getStyledChars` is called after the transformer loop, not before.
 *
 * The `StyledChar` objects handed out are shared — the same object can land in
 * several grid cells and several frames. Nothing in `compute()` or
 * `styledCharsToString` mutates one: every operation in
 * `@alcalzone/ansi-tokenize` is copy-on-write, and cells are replaced, never
 * edited. ink relies on that within a frame; `compute()`'s row memo relies on it
 * across frames, so a future in-place edit of a `StyledChar` would break both.
 *
 * ## Why two generations and not an LRU
 *
 * Surviving the frame is what makes retention a problem: an unbounded memo of
 * every line a long-running TUI has ever drawn measured **+2 078 MB** over 3 000
 * frames of entirely fresh content, against +78 MB for the per-frame form.
 * Rather than tune a capacity, `rotate()` keeps exactly what the **last frame**
 * used: a lookup hitting `previous` promotes the entry into `current`, and
 * whatever `previous` still holds at the next rotation is dropped. Retention is
 * bounded by two frames' distinct lines however long the process runs (measured:
 * +78.1 MB on the same workload, i.e. nothing over the per-frame form), while a
 * screen that keeps redrawing itself hits forever with no capacity to guess. A
 * line that vanishes for one frame and comes back is recomputed — a miss, never
 * a wrong answer.
 *
 * @internal
 */
class LayerCaches {
  private styledChars = new Map<string, StyledChar[]>();
  private widths = new Map<string, number>();
  private blockWidths = new Map<string, number>();

  private previousStyledChars = new Map<string, StyledChar[]>();
  private previousWidths = new Map<string, number>();
  private previousBlockWidths = new Map<string, number>();

  getStyledChars(line: string): StyledChar[] {
    return promote(this.styledChars, this.previousStyledChars, line, () =>
      styledCharsFromTokens(tokenize(line)),
    );
  }

  getStringWidth(text: string): number {
    return promote(this.widths, this.previousWidths, text, () =>
      stringWidth(text),
    );
  }

  getWidestLine(text: string): number {
    return promote(this.blockWidths, this.previousBlockWidths, text, () =>
      widestLine(text),
    );
  }

  /**
   * End the frame: what this frame used becomes "previous", and what only the
   * frame before it used is released.
   */
  rotate(): void {
    this.previousStyledChars = this.styledChars;
    this.styledChars = new Map();

    this.previousWidths = this.widths;
    this.widths = new Map();

    this.previousBlockWidths = this.blockWidths;
    this.blockWidths = new Map();
  }
}

/**
 * Two-generation memo lookup: serve from this frame, else adopt last frame's
 * answer, else compute. Either way the entry lands in `current`, which is what
 * makes it survive the next `rotate()`.
 *
 * @internal
 */
function promote<V>(
  current: Map<string, V>,
  previous: Map<string, V>,
  key: string,
  compute: () => V,
): V {
  const hit = current.get(key);

  if (hit !== undefined) return hit;

  const carried = previous.get(key);
  const value = carried === undefined ? compute() : carried;

  current.set(key, value);

  return value;
}

/**
 * The lowest UTF-16 code unit whose grapheme prints two columns wide, and so
 * the exclusive upper bound of the range {@link SINGLE_UNIT_WIDTHS} can be
 * seeded with `1` outright. Exported only so the sweep in `Layer.test.ts`
 * asserts the boundary this file actually uses rather than a copy of it.
 *
 * @internal
 */
export const FIRST_WIDE_CODE_UNIT = 0x1100;

/**
 * Printed width of every grapheme that is a **single UTF-16 code unit**,
 * indexed by that code unit — i.e. exactly `Math.max(1, stringWidth(value))`,
 * precomputed where it is knowable and filled in lazily everywhere else.
 *
 * ## Why it exists
 *
 * `compute()` needs a printed width per character per cell per frame, and the
 * straight port of ink's rule pays a `Map<string, number>` lookup for each. That
 * is real money on a full screen: measured against the previous
 * `character.fullWidth || character.value.length > 1` property read, the plain
 * port cost **+13 % median and +25.8 % worst case** across the seven paint
 * workloads in the frame benchmark. Reading a `Uint8Array` by code unit brings
 * the same rule to **+4.3 % median, +8 % worst**. Both are from one process
 * alternating between the two implementations for eleven rounds, so they are a
 * comparison rather than two runs of a drifting machine.
 *
 * ## Why it cannot be wrong
 *
 * Same argument as `LayerCaches`, only stronger: the key *is* the whole input. A
 * one-code-unit grapheme is fully determined by its code unit, and `stringWidth`
 * is pure, so there is no input to invalidate on. Graphemes of two or more code
 * units — surrogate pairs, ZWJ sequences, anything with a combining mark — are
 * not indexable this way and fall through to the measured path unchanged.
 *
 * The pre-seed of `1` below `U+1100` is not an approximation either: every code
 * unit in `0x0000..0x10FF` was checked, and `Math.max(1, stringWidth(...))` is
 * `1` for all 4 352 of them, with `U+1100` the first that is two columns wide.
 * `Layer.test.ts` re-runs that sweep, so a `string-width` upgrade moving the
 * boundary fails rather than silently mismeasuring. Seeded rather than left to
 * the lazy fill because that range is nearly all the text a terminal ever draws.
 *
 * `0` is the "not measured yet" marker, and cannot collide with a real answer:
 * `Math.max(1, ...)` never returns `0`.
 *
 * @internal
 */
const SINGLE_UNIT_WIDTHS = new Uint8Array(0x10000).fill(
  1,
  0,
  FIRST_WIDE_CODE_UNIT,
);

/**
 * The one object every untouched grid cell holds.
 *
 * A frame allocated `width * height` identical blank cells — the largest
 * allocation in the engine, and pure waste: a cell is *replaced* when something
 * paints over it, never edited, so one shared instance is indistinguishable from
 * a million private ones. Sharing it is also what makes the row memo possible,
 * because two untouched rows are then identical by object identity rather than
 * merely equal.
 *
 * **Nothing may mutate this, or any `StyledChar`.** A single in-place edit would
 * reach every blank cell of every row at once, and would silently invalidate the
 * row memo's whole argument. `@alcalzone/ansi-tokenize` is copy-on-write
 * throughout, which is what makes the rule keepable.
 *
 * @internal
 */
const BLANK_CELL: StyledChar = {
  type: 'char',
  value: ' ',
  fullWidth: false,
  styles: [],
};

export default class Layer {
  width: number;
  height: number;
  frame: string;
  frameHeight: number;

  private readonly operations: Operation[] = [];

  /** @internal */
  private readonly caches = new LayerCaches();

  /**
   * Last frame's grid rows and the string each serialised to, so a row nothing
   * repainted is not serialised again. See `compute()`.
   *
   * @internal
   */
  private previousRows: (StyledChar[] | undefined)[] = [];

  /** @internal */
  private previousRowStrings: string[] = [];

  /**
   * The blank cell written *after* a wide character, memoised per character.
   *
   * It exists only to stop the next column printing over a two-column glyph, it
   * carries that character's styles, and it is never mutated — so one instance
   * per character is enough, and giving the same character the same
   * continuation object at every write position is what lets two rows holding
   * the same wide glyph compare identical.
   *
   * Weak, because its keys are the memoised `StyledChar`s and those are
   * released when `LayerCaches` rotates them out.
   *
   * @internal
   */
  private readonly continuationCells = new WeakMap<StyledChar, StyledChar>();

  constructor(options: Options) {
    const { width, height } = options;

    this.width = width;
    this.height = height;
    this.frame = '';
    this.frameHeight = 0;
  }

  write(
    x: number,
    y: number,
    text: string,
    options: { transformers: OutputTransformer[] },
  ): void {
    const { transformers } = options;

    if (!text) {
      return;
    }

    this.operations.push({
      type: 'write',
      x,
      y,
      text,
      transformers,
    });
  }

  /** @internal */
  private continuationCell(character: StyledChar): StyledChar {
    let cell = this.continuationCells.get(character);

    if (cell === undefined) {
      cell = {
        type: 'char',
        value: '',
        fullWidth: false,
        styles: character.styles,
      };

      this.continuationCells.set(character, cell);
    }

    return cell;
  }

  /**
   * Whether row `y` holds exactly the cells it held last frame, so its
   * serialised string can be reused.
   *
   * ## Why this is allowed to be a cross-frame cache
   *
   * `styledCharsToString` is a pure function of the sequence of `StyledChar`s
   * it is handed, so two rows made of the same objects in the same order
   * serialise to the same bytes. The key here *is* the value — the identity
   * sequence — not a frame number or a revision, which is what makes it the
   * safe kind of cache: a row that differs anywhere is a miss, never a wrong
   * hit. The one premise is that a `StyledChar` is never mutated in place; see
   * `BLANK_CELL`.
   *
   * That premise is only reachable because the line memo now spans frames.
   * Identical text produces the identical `StyledChar[]` two frames running,
   * every untouched cell is the shared `BLANK_CELL`, and a wide glyph's
   * continuation is memoised per character — so an unrepainted row really is
   * identical by `===`, cell for cell, rather than merely equal.
   *
   * `styledCharsToString` is the single most expensive thing left in the frame:
   * it calls `diffAnsiCodes` per character, which allocates three `Set`s each
   * time. Skipping it for the rows a TUI did not touch is where this pays.
   *
   * Comparing is O(width) of `===` and bails at the first difference, so a row
   * that *did* change costs almost nothing before being serialised anyway —
   * measured at or below the noise floor on a workload where every row changes
   * every frame.
   *
   * @internal
   */
  private sameAsLastFrame(y: number, row: StyledChar[]): boolean {
    const previous = this.previousRows[y];

    // Length carries the width, and a frame that grew has no previous row here
    // at all. Both are only shortcuts: the cell-by-cell comparison below is the
    // correctness argument on its own.
    if (previous === undefined || previous.length !== row.length) return false;

    for (let x = 0; x < row.length; x++) {
      if (previous[x] !== row[x]) return false;
    }

    return true;
  }

  clip(clip: Clip) {
    this.operations.push({
      type: 'clip',
      clip,
    });
  }

  unclip() {
    this.operations.push({
      type: 'unclip',
    });
  }

  compute() {
    // Initialize output array with a specific set of rows, so that margin/padding at the bottom is preserved
    const output: StyledChar[][] = [];

    for (let y = 0; y < this.height; y++) {
      // TRAP: this array must be freshly allocated every frame. The row memo at
      // the end of this method decides a row is unchanged by comparing it cell
      // by cell against `previousRows[y]` — and `previousRows[y]` is this very
      // array once the frame ends. Reusing and refilling it would make that
      // comparison compare the array with itself, so every row would look
      // unchanged and the frame would freeze on its first paint, forever, with
      // every test still green.
      const row: StyledChar[] = [];

      for (let x = 0; x < this.width; x++) {
        row.push(BLANK_CELL);
      }

      output.push(row);
    }

    const clips: Clip[] = [];

    for (const operation of this.operations) {
      if (operation.type === 'clip') {
        clips.push(operation.clip);
      }

      if (operation.type === 'unclip') {
        clips.pop();
      }

      if (operation.type === 'write') {
        const { text, transformers } = operation;
        let { x, y } = operation;
        let lines = text.split('\n');

        const clip = clips.at(-1);

        if (clip) {
          const clipHorizontally =
            typeof clip?.x1 === 'number' && typeof clip?.x2 === 'number';

          const clipVertically =
            typeof clip?.y1 === 'number' && typeof clip?.y2 === 'number';

          // If text is positioned outside of clipping area altogether,
          // skip to the next operation to avoid unnecessary calculations
          if (clipHorizontally) {
            const width = this.caches.getWidestLine(text);

            if (x + width < clip.x1! || x > clip.x2!) {
              continue;
            }
          }

          if (clipVertically) {
            const height = lines.length;

            if (y + height < clip.y1! || y > clip.y2!) {
              continue;
            }
          }

          if (clipHorizontally) {
            lines = lines.map(line => {
              const from = x < clip.x1! ? clip.x1! - x : 0;
              const width = this.caches.getStringWidth(line);
              const to = x + width > clip.x2! ? clip.x2! - x : width;

              return sliceAnsi(line, from, to);
            });

            if (x < clip.x1!) {
              x = clip.x1!;
            }
          }

          if (clipVertically) {
            const from = y < clip.y1! ? clip.y1! - y : 0;
            const height = lines.length;
            const to = y + height > clip.y2! ? clip.y2! - y : height;

            lines = lines.slice(from, to);

            if (y < clip.y1!) {
              y = clip.y1!;
            }
          }
        }

        let offsetY = 0;

        for (let [index, line] of lines.entries()) {
          const currentLine = output[y + offsetY];

          // Line can be missing if `text` is taller than height of pre-initialized `this.output`
          if (!currentLine) {
            continue;
          }

          for (const transformer of transformers) {
            line = transformer(line, index);
          }

          const characters = this.caches.getStyledChars(line);
          let offsetX = x;

          // Nothing to write (e.g. the line was clipped away entirely). Bails
          // before the two boundary repairs below, which would otherwise fire
          // on a write that puts no character anywhere -- the leading one in
          // particular would blank a wide glyph this operation never touches.
          if (characters.length === 0) {
            offsetY++;
            continue;
          }

          // A wide glyph occupies a leading cell holding the character and a
          // trailing continuation cell holding `''`. An overlapping write that
          // starts *on* that continuation cell would leave the leading half
          // behind, and the terminal would print a whole wide glyph plus this
          // line on top of it -- everything after it shifted a column right.
          // So the orphaned leading half is replaced with a space.
          //
          // The third clause -- that the cell to the left really is wide --
          // is carried from ink and kept, but nothing appears able to reach
          // it: the repair below already replaces an orphaned continuation
          // cell with a space at the end of every write, so a `''` cell whose
          // neighbour is *not* wide does not survive to be seen here. Ablating
          // the clause to `true` left 20 000 random write sequences still
          // byte-identical to ink, which is why there is no test for it.
          if (
            currentLine[offsetX]?.value === '' &&
            offsetX > 0 &&
            this.caches.getStringWidth(currentLine[offsetX - 1]?.value ?? '') > 1
          ) {
            currentLine[offsetX - 1] = BLANK_CELL;
          }

          for (const character of characters) {
            currentLine[offsetX] = character;

            // The printed width, measured the same way the *layout* measured
            // it (`string-width`, through `widestLine`/`wrapText`), so the two
            // cannot disagree. `Math.max(1, ...)` because a zero-width
            // measurement still consumed the cell written just above.
            //
            // Deliberately not `character.fullWidth || value.length > 1`, the
            // rule this replaced: that charged two columns to every
            // multi-code-point grapheme, so a base letter with a combining
            // mark, or any astral-plane character, advanced one column further
            // than it printed and the next grapheme landed on top of it.
            //
            // `character.fullWidth` is also not usable as a shortcut *into*
            // this rule. `@alcalzone/ansi-tokenize` computes it from its own
            // predicate (fullwidth base code point, or VS16, or a regional
            // indicator), which is a different question from what
            // `string-width` answers — and disagreeing with the measurement
            // the layout used is the whole bug being fixed here.
            const value = character.value;
            let characterWidth: number;

            if (value.length === 1) {
              const code = value.charCodeAt(0);
              characterWidth = SINGLE_UNIT_WIDTHS[code]!;

              if (characterWidth === 0) {
                characterWidth = Math.max(1, this.caches.getStringWidth(value));
                SINGLE_UNIT_WIDTHS[code] = characterWidth;
              }
            } else {
              characterWidth = Math.max(1, this.caches.getStringWidth(value));
            }

            if (characterWidth > 1) {
              // One memoised continuation object fills every trailing cell:
              // they are identical and never mutated, and reusing it is what
              // lets `sameAsLastFrame` compare rows by `===`.
              const continuation = this.continuationCell(character);

              for (let index = 1; index < characterWidth; index++) {
                currentLine[offsetX + index] = continuation;
              }
            }

            offsetX += characterWidth;
          }

          // The mirror image of the repair above: this line can end *inside* a
          // wide glyph an earlier write left, orphaning its continuation cell.
          // That cell carries the glyph's styles, so leaving it emits a stray
          // SGR run after the line.
          if (currentLine[offsetX]?.value === '') {
            currentLine[offsetX] = BLANK_CELL;
          }

          offsetY++;
        }
      }
    }

    const rowStrings: string[] = [];

    for (let y = 0; y < output.length; y++) {
      const row = output[y]!;

      if (this.sameAsLastFrame(y, row)) {
        rowStrings.push(this.previousRowStrings[y]!);
        continue;
      }

      // See https://github.com/vadimdemedes/ink/pull/564#issuecomment-1637022742
      const lineWithoutEmptyItems = row.filter(item => item !== undefined);
      const text = styledCharsToString(lineWithoutEmptyItems).trimEnd();

      rowStrings.push(text);
      this.previousRows[y] = row;
      this.previousRowStrings[y] = text;
    }

    // Truncate, so a frame that shrinks and grows again cannot match a row left
    // over from before it shrank.
    this.previousRows.length = output.length;
    this.previousRowStrings.length = output.length;

    const generatedOutput = rowStrings.join('\n');

    this.frame = generatedOutput;
    this.frameHeight = generatedOutput.length;
    this.operations.length = 0;
    this.caches.rotate();
  }
}
