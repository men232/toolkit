import { describe, expect, it } from 'vitest';
import { inkCreateInputParser } from '../../test/helpers/inkParser';
import { createInputParser } from './inputParser';

/**
 * Differential test suite: every case below drives both ink's own compiled
 * `input-parser.js` (the oracle) and our port through the same sequence of
 * `push()` calls, then asserts they agree on every emitted event and on
 * `hasPendingEscape()`/`flushPendingEscape()` afterwards.
 *
 * No table of expected events is hand-written here — per the task brief,
 * that would risk transcription errors precisely where they're hardest to
 * spot (CSI boundary detection, paste markers, split-read reassembly).
 * Instead we drive a wide set of raw chunk sequences and let ink's own
 * behaviour be the expectation.
 *
 * Buffer ownership: `push()` only takes JS strings (immutable), and this
 * module's internal state is a single `pending` string replaced wholesale
 * on every call (`pending + chunk`, then `.slice(...)`) — there is no
 * shared mutable buffer here for either parser to corrupt, unlike
 * `parseKeypress`'s `Uint8Array` case. See `inputParser.ts`'s file header
 * for the full reasoning.
 */

const ESC = '\x1b';
const PASTE_START = `${ESC}[200~`;
const PASTE_END = `${ESC}[201~`;

/** Drive one session (a fresh parser instance) through a sequence of chunks
 * fed to `push()`, one at a time, and assert the two parsers agree at every
 * step and in their final pending state. */
function checkSession(name: string, chunks: string[]) {
  it(name, () => {
    const inkParser = inkCreateInputParser();
    const ourParser = createInputParser();

    chunks.forEach((chunk, step) => {
      const inkEvents = inkParser.push(chunk);
      const ourEvents = ourParser.push(chunk);
      expect(ourEvents, `events differ at push #${step} (chunk ${JSON.stringify(chunk)})`).toEqual(
        inkEvents,
      );
    });

    expect(ourParser.hasPendingEscape()).toBe(inkParser.hasPendingEscape());

    const inkFlushed = inkParser.flushPendingEscape();
    const ourFlushed = ourParser.flushPendingEscape();
    expect(ourFlushed).toBe(inkFlushed);

    // After flushing, both should report no pending escape and, if fed the
    // same chunk again, behave identically (proves `reset`-adjacent state
    // is fully drained, not partially cleared).
    expect(ourParser.hasPendingEscape()).toBe(inkParser.hasPendingEscape());
  });
}

/** Feed a single full sequence as one chunk, then as every possible
 * two-way split, then byte-by-byte — the exhaustive way to prove split
 * reads never corrupt or lose events, without hand-writing expectations
 * for each split point. */
function checkAllSplits(label: string, sequence: string) {
  describe(label, () => {
    checkSession(`whole chunk: ${JSON.stringify(sequence)}`, [sequence]);

    for (let i = 1; i < sequence.length; i++) {
      checkSession(
        `split at ${i}: ${JSON.stringify(sequence.slice(0, i))} | ${JSON.stringify(sequence.slice(i))}`,
        [sequence.slice(0, i), sequence.slice(i)],
      );
    }

    checkSession(
      `byte-by-byte: ${JSON.stringify(sequence)}`,
      [...sequence],
    );
  });
}

describe('createInputParser', () => {
  describe('plain text in a single read', () => {
    checkSession('empty chunk', ['']);
    checkSession('plain letters', ['hello world']);
    checkSession('digits and punctuation', ['abc123!@#']);
  });

  describe('several keys in one read', () => {
    checkAllSplits('letter, arrow, letter', `a${ESC}[Bb`);
    checkAllSplits('SS3 then CSI then plain', `${ESC}OAc${ESC}[C`);
    checkAllSplits(
      'double-escape (meta) mixed with CSI',
      `${ESC}${ESC}[Ax${ESC}[1;5H`,
    );
    checkAllSplits('multiple plain runs and one escape', `foo${ESC}[Dbar`);
    checkAllSplits(
      'kitty CSI-u sequence next to plain text',
      `q${ESC}[97;5u r`,
    );
    checkAllSplits('legacy ESC[[A style function key', `${ESC}[[Az`);
  });

  describe('sequences split across two reads', () => {
    checkSession('ESC alone, then [A', [ESC, '[A']);
    checkSession('ESC[ then A', [`${ESC}[`, 'A']);
    checkSession('ESC[1 then ;5H', [`${ESC}[1`, ';5H']);
    checkSession('ESC[1; then 5H', [`${ESC}[1;`, '5H']);
    checkSession('ESC O then A (SS3)', [`${ESC}O`, 'A']);
    checkSession('double ESC then ESC[A', [ESC, `${ESC}[A`]);
    checkSession('plain text then split escape', ['hi', ESC, '[B', 'bye']);
    checkSession('escape split into three reads', [ESC, '[', '5', '~']);
  });

  describe('bracketed paste', () => {
    checkSession('paste in one chunk', [`${PASTE_START}hello${PASTE_END}`]);
    checkSession('empty paste', [`${PASTE_START}${PASTE_END}`]);
    checkSession('paste split before content', [PASTE_START, `hello${PASTE_END}`]);
    checkSession('paste split mid-content', [
      `${PASTE_START}hel`,
      `lo${PASTE_END}`,
    ]);
    checkSession('paste split mid-start-marker', [
      `${ESC}[200`,
      `~hello${PASTE_END}`,
    ]);
    checkSession('paste split mid-end-marker', [
      `${PASTE_START}hello${ESC}[201`,
      '~',
    ]);
    checkSession('paste content containing escape-like bytes', [
      `${PASTE_START}before${ESC}[Aafter${PASTE_END}`,
    ]);
    checkSession('paste content containing backspace byte (not split)', [
      `${PASTE_START}ab${PASTE_END}`,
    ]);
    checkSession('text, paste, then more text in one read', [
      `pre${PASTE_START}mid${PASTE_END}post`,
    ]);
    checkSession('two consecutive pastes in one read', [
      `${PASTE_START}one${PASTE_END}${PASTE_START}two${PASTE_END}`,
    ]);
    checkSession('paste start marker split byte-by-byte', [...PASTE_START, 'x', ...PASTE_END]);
  });

  describe('backspace splitting', () => {
    checkSession('single backspace', ['']);
    checkSession('single ctrl-h backspace', ['']);
    checkSession('repeated backspace in one chunk', ['']);
    checkSession('text then backspace then text', ['abcd']);
    checkSession('backspace between two escapes', [
      `${ESC}[A${ESC}[B`,
    ]);
  });

  describe('invalid / edge escape sequences', () => {
    checkSession('CSI with invalid final byte falls back to escaped codepoint', [
      `${ESC}[rest`,
    ]);
    checkSession('escaped surrogate-pair codepoint (emoji)', [`${ESC}🎉x`]);
    checkSession('lone ESC at end of input (pending)', ['abc', ESC]);
    checkSession('ESC followed by nothing else, then more input', [
      ESC,
      'a',
    ]);
    checkSession('SS3 with invalid final byte', [`${ESC}O`]);
  });

  describe('reset', () => {
    it('clears pending state so a later push starts clean', () => {
      const inkParser = inkCreateInputParser();
      const ourParser = createInputParser();

      inkParser.push(`${ESC}[`);
      ourParser.push(`${ESC}[`);
      expect(ourParser.hasPendingEscape()).toBe(inkParser.hasPendingEscape());

      inkParser.reset();
      ourParser.reset();
      expect(ourParser.hasPendingEscape()).toBe(inkParser.hasPendingEscape());

      const inkEvents = inkParser.push('A');
      const ourEvents = ourParser.push('A');
      expect(ourEvents).toEqual(inkEvents);
    });
  });
});
