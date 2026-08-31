/**
 * A minimal terminal-state reducer for tests -- enough of a terminal to
 * answer one question the raw write log cannot: *what is still on screen?*
 *
 * `createStdout()` records every write verbatim, which is the right level
 * for asserting "this exact escape sequence was emitted". It is the wrong
 * level for asserting that two different rendering strategies
 * (`Container`'s full repaint and its incremental diff, see
 * `src/incrementalRender.ts`) leave the user looking at the same thing:
 * those two produce deliberately *different* bytes for the same frame
 * sequence, and a line present in the byte log may since have been erased by
 * a later cursor-up + erase. Only replaying the sequences against a screen
 * buffer can tell the two apart.
 *
 * Modelled on ink's own `test/helpers/reconstruct-terminal.ts`, and
 * deliberately no more general than that one: it understands exactly the
 * escape sequences this package emits (`ansi-escapes`' `cursorUp`,
 * `cursorDown`, `cursorNextLine`, `cursorTo`, `eraseLine`, `eraseEndLine`,
 * `eraseLines`, `clearTerminal`, plus the cursor show/hide private modes),
 * and ignores everything else. It is not a terminal emulator.
 *
 * One deliberate difference from ink's version: `'\n'` here moves the cursor
 * to column 0 of the next row (CRLF), not merely down a row. That is what a
 * Node.js TTY actually does -- libuv keeps `ONLCR` enabled in its raw mode
 * (`uv_tty_set_mode`) precisely so output post-processing still translates
 * LF to CRLF -- and the incremental strategy's line walk depends on it: it
 * emits `line + '\n'` for a changed line and then addresses the *next* row
 * with a bare `cursorNextLine`, which is only in the right place if the
 * newline already returned the cursor to column 0. Modelling LF as
 * "down one row, column unchanged" would put this helper's screen out of
 * step with the real terminal, and it would do so in exactly the
 * changed-line-followed-by-unchanged-line case the incremental strategy
 * exists to optimise -- i.e. it would silently invent a divergence, or hide
 * a real one, in the one place these tests are pointed at.
 *
 * **Known, deliberate gap: no `stdout.columns` / line wrapping.**
 * `ReconstructOptions` has `rows` but no `columns` -- every row here grows
 * without bound (see `writeChar` below) instead of wrapping into a second
 * physical row the way a real terminal does once a line reaches the
 * screen's width. That is the *same direction* of error the ECMA-48 `0`
 * clamp above guards against -- more forgiving than a real terminal, not
 * less -- but it isn't fixed here the way that one was. `Container`'s
 * `ContainerOptions.incrementalRendering` doc comment (`src/Container.ts`)
 * states the same limit from the production side: both of `onFrame`'s
 * strategies compute their cursor moves from *logical* lines, and a
 * wrapped line silently turns one of those into several *physical* rows,
 * shifting every count below it -- for either strategy, not necessarily by
 * the same amount. Teaching this replay model to wrap would surface that
 * gap as a new, currently-nonexistent equivalence-test failure rather than
 * close one; fixing it for real belongs in that cursor arithmetic, not in
 * the test double that watches it. Anything driving this helper with a wide
 * frame is exercising unverified territory, exactly like a frame taller
 * than `rows`.
 *
 * **Also known, deliberately unmodelled: `\x1b[?1049h`/`\x1b[?1049l`**
 * (enter/exit the alternate screen buffer). Both are private-mode sequences
 * (`params.startsWith('?')`, below) and are ignored along with cursor
 * show/hide and bracketed paste -- there is only ever one screen buffer
 * here, never two. Harmless for every test that exercises it today: nothing
 * in this package's own test suite writes to the primary buffer and then
 * switches to the alternate one mid-sequence (the alternate screen is
 * always entered once, at construction, before any content), so there is
 * no primary-buffer content the missing swap could lose. A future
 * equivalence test that mixed primary-buffer writes with an alternate-
 * screen switch would replay both into the same buffer and could agree by
 * coincidence rather than by the swap actually being modelled -- if that
 * ever becomes a real test case, it needs a second buffer here first.
 */

const ESC = String.fromCharCode(27);

function parseParams(raw: string): number[] {
  return raw.split(';').map(value => (value === '' ? Number.NaN : Number(value)));
}

export interface ReconstructOptions {
  /** Terminal height. Rows beyond this scroll off into scrollback. */
  rows?: number;
  /**
   * Include scrolled-off rows in the result. On by default: `<Static>`
   * output and `console.log` output are *meant* to scroll permanently into
   * history, so dropping scrollback would hide exactly the content those
   * features exist to produce.
   */
  includeScrollback?: boolean;
}

/**
 * Replay `output` (the concatenation of every write a `Container` made) and
 * return the lines that would remain visible, scrollback first, each with
 * trailing whitespace trimmed.
 */
export function reconstructTerminalLines(
  output: string,
  { rows = 20, includeScrollback = true }: ReconstructOptions = {},
): string[] {
  const scrollback: string[] = [];
  const screen: string[] = Array.from({ length: rows }, () => '');
  let row = 0;
  let col = 0;

  const writeChar = (char: string): void => {
    const line = screen[row] ?? '';
    const padded = line.length < col ? line + ' '.repeat(col - line.length) : line;
    screen[row] = padded.slice(0, col) + char + padded.slice(col + 1);
    col += 1;
  };

  /**
   * Scroll the screen up by `amount` rows, pushing the rows that fall off
   * the top into `scrollback` -- what a real terminal does whenever the
   * cursor is asked to move below the last row, whether one row at a time
   * (a plain `'\n'`, via {@link lineFeed}) or several at once (`cursorDown`/
   * `cursorNextLine` landing past the bottom, below). A no-op for `0`.
   */
  const scrollBy = (amount: number): void => {
    for (let i = 0; i < amount; i++) {
      scrollback.push(screen.shift() ?? '');
      screen.push('');
    }
  };

  /**
   * Move the cursor down `distance` rows from `row`, scrolling (via
   * {@link scrollBy}) rather than clamping at `rows - 1` if that would run
   * off the bottom -- clamping is the more-forgiving-than-reality error
   * `writeChar`'s wrapping gap already is elsewhere in this file, and
   * `cursorDown`/`cursorNextLine` (cases `'B'`/`'E'` below) used to make the
   * same mistake. Not reachable by anything this package writes today (see
   * the case comments), but a real terminal scrolls here, so this helper
   * must too.
   */
  const moveDown = (distance: number): void => {
    const target = row + distance;
    if (target > rows - 1) {
      scrollBy(target - (rows - 1));
      row = rows - 1;
    } else {
      row = target;
    }
  };

  const lineFeed = (): void => {
    // Column 0, not "column unchanged" -- see this module's own comment.
    col = 0;
    moveDown(1);
  };

  for (let i = 0; i < output.length; i++) {
    const char = output[i]!;

    if (char === ESC && output[i + 1] === '[') {
      let j = i + 2;
      let params = '';

      while (j < output.length && /[\d;?]/.test(output[j]!)) {
        params += output[j];
        j++;
      }

      const finalByte = output[j] ?? '';
      i = j; // Advance past the whole sequence (the loop's own i++ skips the final byte).

      // Private modes -- cursor visibility (`[?25h`/`[?25l`), bracketed
      // paste (`[?2004h`/`[?2004l`), and the alternate screen buffer
      // (`[?1049h`/`[?1049l`, see this module's own comment for why the
      // latter is a deliberate, known gap). None of them touch the single
      // screen buffer this helper models.
      if (params.startsWith('?')) continue;

      const values = parseParams(params);
      const first = Number.isNaN(values[0]!) ? undefined : values[0]!;

      /**
       * The cursor-movement parameter, with ECMA-48's own clamp applied: a
       * `0` parameter to CUU/CUD/CNL/CPL means **one** row, not zero. xterm,
       * VTE and iTerm all do this, so `ESC[0A` moves the cursor up a row on
       * every terminal a user will actually run on.
       *
       * Modelling it as a no-op instead -- the obvious reading of
       * `row - (first ?? 1)` -- makes this helper strictly *more forgiving*
       * than a real terminal, which is the one direction a test double must
       * never err in: it would let an unguarded `cursorUp(0)` walk the frame
       * upward over `<Static>`/`console.log` output on a real screen while
       * every screen comparison here still agreed. That is not hypothetical
       * -- it is exactly the defect this clamp caught in
       * `src/incrementalRender.ts`.
       */
      const distance = first === undefined || first === 0 ? 1 : first;

      switch (finalByte) {
        // cursorUp
        case 'A': {
          row = Math.max(0, row - distance);
          break;
        }

        // cursorDown -- scrolls (via `moveDown`) rather than clamping at
        // `rows - 1` if the move would run past the bottom row, same as a
        // real terminal. Not reachable by anything this package writes
        // today (`ansiEscapes.cursorDown` is only ever used for a bounded
        // move back to a previous frame's bottom line -- see
        // `buildReturnToBottomPrefix`), but a future caller that scrolled
        // this far down must not be silently more forgiven here than a
        // real screen would be.
        case 'B': {
          moveDown(distance);
          break;
        }

        // cursorNextLine
        case 'E': {
          moveDown(distance);
          col = 0;
          break;
        }

        // cursorPrevLine
        case 'F': {
          row = Math.max(0, row - distance);
          col = 0;
          break;
        }

        // cursorTo(x) -- `ansiEscapes.cursorTo(0)` emits `[1G`; `cursorLeft`
        // (the tail of every `eraseLines`) emits a bare `[G`.
        case 'G': {
          col = (first ?? 1) - 1;
          break;
        }

        // cursorTo(x, y)
        case 'H':
        case 'f': {
          const second = Number.isNaN(values[1]!) ? undefined : values[1]!;
          row = (first ?? 1) - 1;
          col = (second ?? 1) - 1;
          break;
        }

        // eraseScreen / clearTerminal
        case 'J': {
          if (first === 2) {
            for (let k = 0; k < rows; k++) screen[k] = '';
          } else if (first === 3) {
            scrollback.length = 0;
          } else {
            screen[row] = (screen[row] ?? '').slice(0, col);
            for (let k = row + 1; k < rows; k++) screen[k] = '';
          }

          break;
        }

        // eraseLine (`[2K`) / eraseEndLine (`[K`)
        case 'K': {
          if (first === 2) {
            screen[row] = '';
          } else if (first === 1) {
            screen[row] = ' '.repeat(col) + (screen[row] ?? '').slice(col);
          } else {
            screen[row] = (screen[row] ?? '').slice(0, col);
          }

          break;
        }

        default:
          break;
      }

      continue;
    }

    switch (char) {
      case '\r': {
        col = 0;
        break;
      }

      case '\n': {
        lineFeed();
        break;
      }

      case '\b': {
        col = Math.max(0, col - 1);
        break;
      }

      // A lone ESC not starting a CSI this understands (an SGR colour
      // sequence's introducer is handled above; `ansi-styles` output is
      // otherwise written as ordinary characters).
      case ESC:
        break;

      default: {
        if (char >= ' ') writeChar(char);
      }
    }
  }

  return [...(includeScrollback ? scrollback : []), ...screen].map(line =>
    line.replace(/\s+$/, ''),
  );
}

/**
 * The visible screen with trailing blank rows dropped -- the useful shape
 * for an assertion, since a 20-row terminal showing two lines of content is
 * followed by eighteen empty strings that say nothing about the render.
 */
export function reconstructTerminalScreen(
  output: string,
  options?: ReconstructOptions,
): string[] {
  const lines = reconstructTerminalLines(output, options);

  let end = lines.length;
  while (end > 0 && lines[end - 1] === '') end--;

  return lines.slice(0, end);
}
