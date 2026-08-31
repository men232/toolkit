import { describe, expect, it } from 'vitest';
import { inkNonAlphanumericKeys, inkParseKeypress } from '../../test/helpers/inkParser';
import { nonAlphanumericKeys, parseKeypress } from './parseKeypress';

/**
 * Differential test suite: every case below calls both ink's own compiled
 * `parse-keypress.js` (the oracle) and our port, then asserts they agree.
 *
 * No table of expected `{name, modifiers}` values is hand-written here —
 * per the task brief, that would risk transcription errors precisely in
 * the hardest-to-spot spots (modifier bit arithmetic, terminal-specific
 * escape variants). Instead we generate a wide set of raw input sequences
 * and let ink's behaviour be the expectation.
 */

function check(sequence: Uint8Array | string) {
  const label =
    typeof sequence === 'string'
      ? JSON.stringify(sequence)
      : `Uint8Array[${Array.from(sequence).join(',')}]`;

  it(`matches ink for ${label}`, () => {
    // Both parsers mutate a high-bit-set byte in place (the
    // `s[0] > 127 && s[1] === undefined` branch does `s[0] -= 128`), so
    // each call must get its own copy of the buffer — sharing one across
    // both calls would let the first call's mutation leak into the
    // second, producing a false divergence that has nothing to do with
    // the parsers actually disagreeing.
    const clone = () =>
      sequence instanceof Uint8Array ? sequence.slice() : sequence;
    const expected = inkParseKeypress(clone());
    const actual = parseKeypress(clone());
    expect(actual).toEqual(expected);
  });
}

const ESC = '\x1b';

describe('parseKeypress', () => {
  describe('plain letters and digits', () => {
    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
      check(String.fromCharCode(c));
    }
    for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
      check(String.fromCharCode(c));
    }
    for (let c = '0'.charCodeAt(0); c <= '9'.charCodeAt(0); c++) {
      check(String.fromCharCode(c));
    }
  });

  describe('control characters', () => {
    check('\r');
    check('\n');
    check('\t');
    check('\b');
    check('\x7f');
    check(ESC);
    check(' ');
    check(`${ESC}\r`);
    check(`${ESC}\b`);
    check(`${ESC}\x7f`);
    check(`${ESC}${ESC}`);
    check(`${ESC} `);
    check('');
  });

  describe('ctrl+letter (0x01-0x1a)', () => {
    for (let c = 1; c <= 26; c++) {
      check(String.fromCharCode(c));
    }
  });

  describe('meta+character', () => {
    for (let c = 'a'.charCodeAt(0); c <= 'z'.charCodeAt(0); c++) {
      check(ESC + String.fromCharCode(c));
    }
    for (let c = 'A'.charCodeAt(0); c <= 'Z'.charCodeAt(0); c++) {
      check(ESC + String.fromCharCode(c));
    }
    for (let c = '0'.charCodeAt(0); c <= '9'.charCodeAt(0); c++) {
      check(ESC + String.fromCharCode(c));
    }
  });

  describe('arrows', () => {
    for (const letter of ['A', 'B', 'C', 'D', 'E']) {
      check(`${ESC}[${letter}`);
      check(`${ESC}O${letter}`);
    }
    // rxvt shift-arrows / ctrl-arrows
    for (const letter of ['a', 'b', 'c', 'd', 'e']) {
      check(`${ESC}[${letter}`);
      check(`${ESC}O${letter}`);
    }
  });

  describe('home/end/pageup/pagedown', () => {
    check(`${ESC}[H`);
    check(`${ESC}[F`);
    check(`${ESC}OH`);
    check(`${ESC}OF`);
    check(`${ESC}[1~`);
    check(`${ESC}[4~`);
    check(`${ESC}[7~`);
    check(`${ESC}[8~`);
    check(`${ESC}[5~`);
    check(`${ESC}[6~`);
    check(`${ESC}[[5~`);
    check(`${ESC}[[6~`);
    check(`${ESC}[7$`);
    check(`${ESC}[8$`);
    check(`${ESC}[5$`);
    check(`${ESC}[6$`);
    check(`${ESC}[7^`);
    check(`${ESC}[8^`);
    check(`${ESC}[5^`);
    check(`${ESC}[6^`);
  });

  describe('insert/delete', () => {
    check(`${ESC}[2~`);
    check(`${ESC}[3~`);
    check(`${ESC}[2$`);
    check(`${ESC}[3$`);
    check(`${ESC}[2^`);
    check(`${ESC}[3^`);
  });

  describe('f1-f12', () => {
    check(`${ESC}OP`);
    check(`${ESC}OQ`);
    check(`${ESC}OR`);
    check(`${ESC}OS`);
    check(`${ESC}[P`);
    check(`${ESC}[Q`);
    check(`${ESC}[R`);
    check(`${ESC}[S`);
    check(`${ESC}[11~`);
    check(`${ESC}[12~`);
    check(`${ESC}[13~`);
    check(`${ESC}[14~`);
    check(`${ESC}[15~`);
    check(`${ESC}[17~`);
    check(`${ESC}[18~`);
    check(`${ESC}[19~`);
    check(`${ESC}[20~`);
    check(`${ESC}[21~`);
    check(`${ESC}[23~`);
    check(`${ESC}[24~`);
    check(`${ESC}[[A`);
    check(`${ESC}[[B`);
    check(`${ESC}[[C`);
    check(`${ESC}[[D`);
    check(`${ESC}[[E`);
  });

  describe('tab / shift+tab', () => {
    check('\t');
    check(`${ESC}[Z`);
  });

  describe('combined modifiers (xterm CSI ; modifier)', () => {
    check(`${ESC}[1;2A`); // shift+up
    check(`${ESC}[1;3A`); // meta+up
    check(`${ESC}[1;5A`); // ctrl+up
    check(`${ESC}[1;6A`); // shift+ctrl+up
    check(`${ESC}[1;9C`); // meta+right
    check(`${ESC}[3;5~`); // ctrl+delete
    check(`${ESC}[15;2~`); // shift+f5
    check(`${ESC}[1;5H`); // ctrl+home
    check(`${ESC}[1;6H`); // shift+ctrl+home
  });

  describe('kitty keyboard protocol (CSI codepoint u)', () => {
    check(`${ESC}[97u`); // 'a', no modifier
    check(`${ESC}[13u`); // return
    check(`${ESC}[32u`); // space
    check(`${ESC}[9u`); // tab
    check(`${ESC}[127u`); // backspace
    check(`${ESC}[27u`); // escape
    check(`${ESC}[1u`); // raw ctrl codepoint range
    check(`${ESC}[97;5u`); // ctrl+a via modifier
    check(`${ESC}[97;3u`); // meta+a via modifier
    check(`${ESC}[97;2u`); // shift+a via modifier
    check(`${ESC}[97;1:2u`); // repeat event type
    check(`${ESC}[97;1:3u`); // release event type
    check(`${ESC}[97;1;97u`); // with text-as-codepoints field
    check(`${ESC}[1114112u`); // invalid codepoint (> U+10FFFF)
  });

  describe('kitty-enhanced special keys (CSI number ; mods : eventType letter|~)', () => {
    check(`${ESC}[1;5:1A`); // ctrl+up, press
    check(`${ESC}[3;1:3~`); // delete, release
  });

  describe('unmatched / edge inputs', () => {
    check('é');
    check('日');
  });

  describe('Uint8Array input', () => {
    check(new TextEncoder().encode('a'));
    check(new TextEncoder().encode('\r'));
    check(Uint8Array.from([0x1b, 0x5b, 0x41])); // ESC [ A
    // Single byte with the high bit set and nothing following: the
    // `s[0] > 127 && s[1] === undefined` branch (high-bit-set byte decoded
    // as ESC + (byte - 128), i.e. meta+char over a raw byte stream).
    check(Uint8Array.from([0xe1])); // -128 -> 0x61 'a' => meta+a
  });

  describe('double-ESC ambiguous escape (ESC ESC [ ... / ESC ESC O ...)', () => {
    // fnKeyRe's `segs[0] === '\x1b' && segs[1] === '\x1b'` branch: a second
    // leading ESC ahead of a CSI/SS3 sequence, as some terminals send for
    // Alt+<arrow/function-key>.
    check(`${ESC}${ESC}[A`); // alt+up (CSI form)
    check(`${ESC}${ESC}OP`); // alt+f1 (SS3 form)
    check(`${ESC}${ESC}[3~`); // alt+delete (CSI ~ form)
  });

  it('exposes nonAlphanumericKeys matching ink', () => {
    expect(nonAlphanumericKeys).toEqual(inkNonAlphanumericKeys);
  });
});
