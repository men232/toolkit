import { describe, expect, it } from 'vitest';
import { sanitizeAnsi } from './sanitizeAnsi';

const ESC = '';

describe('sanitizeAnsi', () => {
  it('leaves plain text untouched', () => {
    expect(sanitizeAnsi('hello world')).toBe('hello world');
  });

  it('strips a screen-clear sequence', () => {
    expect(sanitizeAnsi(`before${ESC}[2Jafter`)).toBe('beforeafter');
  });

  it('strips a cursor-movement sequence', () => {
    expect(sanitizeAnsi(`before${ESC}[10;10Hafter`)).toBe('beforeafter');
  });

  it('strips an alternate-screen-buffer switch', () => {
    expect(sanitizeAnsi(`before${ESC}[?1049hafter`)).toBe('beforeafter');
  });

  it('keeps an SGR color sequence', () => {
    const input = `${ESC}[32mgreen${ESC}[39m`;
    expect(sanitizeAnsi(input)).toBe(input);
  });

  it('keeps an SGR bold sequence', () => {
    const input = `${ESC}[1mbold${ESC}[22m`;
    expect(sanitizeAnsi(input)).toBe(input);
  });

  it('keeps an OSC hyperlink sequence', () => {
    const input = `${ESC}]8;;https://example.com${ESC}\\link text${ESC}]8;;${ESC}\\`;
    expect(sanitizeAnsi(input)).toBe(input);
  });

  it('keeps an OSC hyperlink terminated with BEL', () => {
    const input = `${ESC}]8;;https://example.comlink text${ESC}]8;;`;
    expect(sanitizeAnsi(input)).toBe(input);
  });

  it('strips a non-SGR CSI while keeping surrounding SGR and text intact', () => {
    const input = `${ESC}[31mred${ESC}[2J${ESC}[39m`;
    expect(sanitizeAnsi(input)).toBe(`${ESC}[31mred${ESC}[39m`);
  });

  it('does not treat a malformed/incomplete escape sequence as a crash', () => {
    expect(() => sanitizeAnsi(`text${ESC}[`)).not.toThrow();
  });

  it('returns text unchanged when it has no control characters at all', () => {
    const input = 'no escapes here';
    expect(sanitizeAnsi(input)).toBe(input);
  });

  // Single-byte C1 introducers (0x9B for CSI, 0x9D for OSC) are a distinct
  // code path from the two-byte ESC-prefixed form (ESC [, ESC ]) used by
  // every other case in this file. Pinned separately so a refactor that
  // silently drops C1 handling cannot pass while every other test still does.
  it('strips a screen-clear sequence written with the single-byte C1 CSI introducer', () => {
    const c1Csi = String.fromCharCode(0x9b);
    expect(sanitizeAnsi(`before${c1Csi}2Jafter`)).toBe('beforeafter');
  });

  it('keeps an OSC hyperlink sequence written with the single-byte C1 OSC introducer', () => {
    const c1Osc = String.fromCharCode(0x9d);
    const st = String.fromCharCode(0x9c);
    const input = `${c1Osc}8;;https://example.com${st}link text${c1Osc}8;;${st}`;
    expect(sanitizeAnsi(input)).toBe(input);
  });
});
