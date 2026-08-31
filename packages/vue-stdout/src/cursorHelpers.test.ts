import ansiEscapes from 'ansi-escapes';
import { describe, expect, it } from 'vitest';
import {
  buildCursorSuffix,
  buildCursorTeardownSequence,
  buildReturnToBottomPrefix,
} from './cursorHelpers';

const ESC = String.fromCharCode(27);
const showCursorEscape = `${ESC}[?25h`;
const hideCursorEscape = `${ESC}[?25l`;

describe('buildCursorSuffix', () => {
  it('returns an empty string when no cursor position is given', () => {
    expect(buildCursorSuffix(0, undefined)).toBe('');
  });

  it('moves to the column and shows the cursor, with no vertical movement on the bottom line', () => {
    expect(buildCursorSuffix(0, { x: 3, y: 0 })).toBe(
      ansiEscapes.cursorTo(3) + showCursorEscape,
    );
  });

  it('moves up first when the position is above the bottom line', () => {
    expect(buildCursorSuffix(4, { x: 2, y: 1 })).toBe(
      ansiEscapes.cursorUp(3) + ansiEscapes.cursorTo(2) + showCursorEscape,
    );
  });

  it('does not move up when the position is on the bottom line, even with a nonzero bottomLine', () => {
    expect(buildCursorSuffix(4, { x: 0, y: 4 })).toBe(
      ansiEscapes.cursorTo(0) + showCursorEscape,
    );
  });
});

describe('buildReturnToBottomPrefix', () => {
  it('returns an empty string when the cursor was never shown', () => {
    expect(buildReturnToBottomPrefix(false, 3, { x: 0, y: 0 })).toBe('');
  });

  it('returns an empty string when there is no previous position, even if cursorWasShown is true', () => {
    expect(buildReturnToBottomPrefix(true, 3, undefined)).toBe('');
  });

  it('hides the cursor and moves down to the bottom line, then to column 0', () => {
    expect(buildReturnToBottomPrefix(true, 3, { x: 2, y: 0 })).toBe(
      hideCursorEscape + ansiEscapes.cursorDown(2) + ansiEscapes.cursorTo(0),
    );
  });

  it('does not move down when the previous position was already on the bottom line', () => {
    expect(buildReturnToBottomPrefix(true, 3, { x: 2, y: 2 })).toBe(
      hideCursorEscape + ansiEscapes.cursorTo(0),
    );
  });
});

describe('buildCursorTeardownSequence', () => {
  it('returns an empty string when the cursor was never shown', () => {
    expect(buildCursorTeardownSequence(false, 3, { x: 0, y: 0 })).toBe('');
  });

  it('returns an empty string when the cursor was never shown, even with no previous position', () => {
    expect(buildCursorTeardownSequence(false, 3, undefined)).toBe('');
  });

  it('returns to the bottom line and shows the cursor again', () => {
    expect(buildCursorTeardownSequence(true, 3, { x: 2, y: 0 })).toBe(
      hideCursorEscape +
        ansiEscapes.cursorDown(2) +
        ansiEscapes.cursorTo(0) +
        showCursorEscape,
    );
  });

  it('still shows the cursor even when it was already on the bottom line (no movement needed)', () => {
    expect(buildCursorTeardownSequence(true, 3, { x: 2, y: 2 })).toBe(
      hideCursorEscape + ansiEscapes.cursorTo(0) + showCursorEscape,
    );
  });
});
