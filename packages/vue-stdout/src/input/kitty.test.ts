import { describe, expect, it } from 'vitest';
import {
  buildKittyEnableSequence,
  kittyDisableSequence,
  kittyFlags,
  kittyModifiers,
  kittyQuerySequence,
  resolveFlags,
} from './kitty';

const ESC = String.fromCharCode(27);

// This suite covers exactly what this task's brief says CAN be verified
// without a live kitty-capable terminal: that the flag/modifier bit tables
// match the protocol spec ink also implements, that `resolveFlags` encodes
// them correctly, and that the enable/query/disable sequences are the
// right bytes (checked against the literal template strings ink.tsx writes
// -- see `src/input/kitty.ts`'s header comment for the exact lines read).
// It does NOT and CANNOT verify that a real terminal interprets these
// bytes as intended, or that ink's auto-detection handshake (not ported
// here) would behave identically -- that remains unverified, by design.
describe('kittyFlags / kittyModifiers', () => {
  it('matches the kitty keyboard protocol bit values', () => {
    expect(kittyFlags).toEqual({
      disambiguateEscapeCodes: 1,
      reportEventTypes: 2,
      reportAlternateKeys: 4,
      reportAllKeysAsEscapeCodes: 8,
      reportAssociatedText: 16,
    });

    expect(kittyModifiers).toEqual({
      shift: 1,
      alt: 2,
      ctrl: 4,
      super: 8,
      hyper: 16,
      meta: 32,
      capsLock: 64,
      numLock: 128,
    });
  });
});

describe('resolveFlags', () => {
  it('returns 0 for an empty array', () => {
    expect(resolveFlags([])).toBe(0);
  });

  it('returns the bit value for a single flag', () => {
    expect(resolveFlags(['disambiguateEscapeCodes'])).toBe(1);
    expect(resolveFlags(['reportEventTypes'])).toBe(2);
    expect(resolveFlags(['reportAssociatedText'])).toBe(16);
  });

  it('ORs multiple flags together', () => {
    expect(resolveFlags(['disambiguateEscapeCodes', 'reportEventTypes'])).toBe(3);
    expect(
      resolveFlags([
        'disambiguateEscapeCodes',
        'reportEventTypes',
        'reportAlternateKeys',
        'reportAllKeysAsEscapeCodes',
        'reportAssociatedText',
      ]),
    ).toBe(31);
  });

  it('is unaffected by duplicate flags', () => {
    expect(resolveFlags(['reportEventTypes', 'reportEventTypes'])).toBe(2);
  });
});

describe('kitty protocol sequences', () => {
  it('kittyQuerySequence is CSI ? u', () => {
    expect(kittyQuerySequence).toBe(`${ESC}[?u`);
  });

  it('kittyDisableSequence is CSI < u', () => {
    expect(kittyDisableSequence).toBe(`${ESC}[<u`);
  });

  it('buildKittyEnableSequence is CSI > <flags> u', () => {
    expect(buildKittyEnableSequence(['disambiguateEscapeCodes'])).toBe(`${ESC}[>1u`);
    expect(
      buildKittyEnableSequence(['disambiguateEscapeCodes', 'reportEventTypes']),
    ).toBe(`${ESC}[>3u`);
    expect(buildKittyEnableSequence([])).toBe(`${ESC}[>0u`);
  });
});
