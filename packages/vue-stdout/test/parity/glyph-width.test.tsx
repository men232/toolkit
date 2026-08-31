import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

// JSX in this file compiles to Vue's h(). The ink side must be built with
// React.createElement explicitly — see Global Constraints.
const e = React.createElement;

// Every case here measures a glyph whose terminal width is NOT 1 column per
// code point. Layout is driven by `string-width` (and, through it,
// `widest-line` / `wrap-ansi` / `cli-truncate`), so vue-stdout and ink only
// agree if they resolve the same major of that family. Nothing else in the
// parity suite contains a non-ASCII-width glyph, which is how a whole-column
// drift on `✔`/`⚠`/`☑` stayed invisible.
describe('parity: glyph widths', () => {
  // Ambiguous-width class: `string-width` v7 called these 2 columns, v8 calls
  // them 1. A trailing sibling makes the disagreement observable as a spurious
  // space between the two texts.
  for (const glyph of ['✔', '⚠', '☑']) {
    expectParity(
      `ambiguous-width glyph ${glyph} adjacent to text`,
      { columns: 20 },
      () => e(InkBox, null, e(InkText, null, glyph), e(InkText, null, 'x')),
      () => (
        <Box>
          <Text>{glyph}</Text>
          <Text>x</Text>
        </Box>
      ),
    );
  }

  expectParity(
    'ambiguous-width glyph inside a bordered box',
    { columns: 20 },
    () => e(InkBox, { borderStyle: 'round' }, e(InkText, null, '✔ done')),
    () => (
      <Box borderStyle="round">
        <Text>✔ done</Text>
      </Box>
    ),
  );

  // Genuinely wide (East Asian Wide) — 2 columns each in every version. The
  // border has to be placed off the measured content width, so a mismeasure
  // here shows up as a ragged right edge rather than a shifted sibling.
  expectParity(
    'wide East Asian text in a bordered box',
    { columns: 20 },
    () => e(InkBox, { borderStyle: 'round' }, e(InkText, null, '世界')),
    () => (
      <Box borderStyle="round">
        <Text>世界</Text>
      </Box>
    ),
  );

  expectParity(
    'wide East Asian text mixed with ASCII in a bordered box',
    { columns: 20 },
    () => e(InkBox, { borderStyle: 'single' }, e(InkText, null, 'hi 世界 ok')),
    () => (
      <Box borderStyle="single">
        <Text>hi 世界 ok</Text>
      </Box>
    ),
  );

  expectParity(
    'wide East Asian text wraps at the box width',
    { columns: 20 },
    () => e(InkBox, { width: 7 }, e(InkText, null, '世界世界世界')),
    () => (
      <Box width={7}>
        <Text>世界世界世界</Text>
      </Box>
    ),
  );

  expectParity(
    'wide East Asian text truncates at the box width',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-end' }, '世界世界世界'),
      ),
    () => (
      <Box width={7}>
        <Text wrap="truncate-end">世界世界世界</Text>
      </Box>
    ),
  );

  // Grapheme clusters: a ZWJ family sequence and a variation-selector-16
  // emoji. Both are multi-code-point single graphemes; measuring them per
  // code point rather than per grapheme inflates the width.
  expectParity(
    'ZWJ emoji sequence adjacent to text',
    { columns: 20 },
    () => e(InkBox, null, e(InkText, null, '👨‍👩‍👧'), e(InkText, null, 'x')),
    () => (
      <Box>
        <Text>👨‍👩‍👧</Text>
        <Text>x</Text>
      </Box>
    ),
  );

  expectParity(
    'ZWJ emoji sequence inside a bordered box',
    { columns: 20 },
    () => e(InkBox, { borderStyle: 'round' }, e(InkText, null, '👨‍👩‍👧')),
    () => (
      <Box borderStyle="round">
        <Text>👨‍👩‍👧</Text>
      </Box>
    ),
  );

  expectParity(
    'variation-selector emoji adjacent to text',
    { columns: 20 },
    () => e(InkBox, null, e(InkText, null, '❤️'), e(InkText, null, 'x')),
    () => (
      <Box>
        <Text>❤️</Text>
        <Text>x</Text>
      </Box>
    ),
  );

  // Narrow *and* multi-code-point: a base letter plus a combining mark is one
  // grapheme occupying one column. `Layer.compute` used to charge two columns
  // to any multi-code-point grapheme, so two of these in a row drifted -- ink
  // emitted 'áb́x', we emitted 'áx', with the second grapheme silently
  // overwritten by the stray advance. A single one ('é') survived that bug
  // because the stray column landed on padding, which is why the doubled form
  // is what this asserts.
  //
  // Written with explicit escapes on purpose: as literal characters in the
  // source these decompose/recompose on save (editors normalise to NFC), and
  // the precomposed 'á' does not reproduce the bug.
  const combining = 'a\u0301b\u0301';

  expectParity(
    'consecutive combining-mark graphemes',
    { columns: 20 },
    () => e(InkBox, null, e(InkText, null, combining), e(InkText, null, 'x')),
    () => (
      <Box>
        <Text>{combining}</Text>
        <Text>x</Text>
      </Box>
    ),
  );

  // The same mismeasure reached every astral-plane character: a surrogate pair
  // is `value.length === 2` and one column wide. A separate case because it
  // takes the *other* arm of the old rule and would survive a fix that only
  // special-cased combining marks.
  const astral = '\u{1D54F}\u{1D550}';

  expectParity(
    'astral-plane letters adjacent to text',
    { columns: 20 },
    () => e(InkBox, null, e(InkText, null, astral), e(InkText, null, 'x')),
    () => (
      <Box>
        <Text>{astral}</Text>
        <Text>x</Text>
      </Box>
    ),
  );
});
