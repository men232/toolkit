import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

// `wrap-text` (our `textWrap`) had no parity case at all before this file.
// Text deliberately wider than its container ("Hello World", 11 columns,
// inside a 7-wide Box), one case per value.
//
// Naming divergence, and do not "fix" it — the argument is right here: ink's
// `Text` exposes
// this as `wrap`, and its enum is `'wrap' | 'hard' | 'truncate' |
// 'truncate-start' | 'truncate-middle' | 'truncate-end'`. Our public enum
// (`Styles['textWrap']`) is `'wrap' | 'end' | 'middle' | 'truncate' |
// 'truncate-start' | 'truncate-middle' | 'truncate-end'` — the same five
// `wrap`/`truncate*` names, plus bare `end`/`middle` where ink instead has
// `hard`. `end` and `middle` read as shorthand for `truncate-end` /
// `truncate-middle` (they reuse cli-truncate's own `position` vocabulary,
// which `wrapText.ts` already imports), so that is the mapping used below —
// NOT a mapping to ink's unrelated `hard` (full hard-wrap, breaking
// mid-word, which has no counterpart in our enum at all and is out of scope
// here since it isn't one of our values).
//
// These cases set `textWrap` on the wrapping `Box` rather than `wrap` on
// `<Text>` directly: even now that `Text.tsx` maps its own `wrap` prop onto
// the `textWrap` attribute (see `Text.tsx`/`Text.test.tsx`), a bare style
// value inherited from an ancestor exercises `getTextWrapStyle`'s fallback
// path (`src/tree/layout.ts`) too, and keeps this file's cases uniform.

describe('parity: wrap-text', () => {
  expectParity(
    'wrap',
    { columns: 20 },
    () =>
      e(InkBox, { width: 7 }, e(InkText, { wrap: 'wrap' }, 'Hello World')),
    () => (
      <Box width={7} textWrap="wrap">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  expectParity(
    'truncate',
    { columns: 20 },
    () =>
      e(InkBox, { width: 7 }, e(InkText, { wrap: 'truncate' }, 'Hello World')),
    () => (
      <Box width={7} textWrap="truncate">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  expectParity(
    'truncate-start',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-start' }, 'Hello World'),
      ),
    () => (
      <Box width={7} textWrap="truncate-start">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  expectParity(
    'truncate-middle',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-middle' }, 'Hello World'),
      ),
    () => (
      <Box width={7} textWrap="truncate-middle">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  expectParity(
    'truncate-end',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-end' }, 'Hello World'),
      ),
    () => (
      <Box width={7} textWrap="truncate-end">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  // `end` mapped to ink's `truncate-end` (see file header).
  expectParity(
    'end (mapped to ink truncate-end)',
    { columns: 20 },
    () =>
      e(InkBox, { width: 7 }, e(InkText, { wrap: 'truncate-end' }, 'Hello World')),
    () => (
      <Box width={7} textWrap="end">
        <Text>Hello World</Text>
      </Box>
    ),
  );

  // Same mapping as `end` above, onto ink's `truncate-middle`.
  expectParity(
    'middle (mapped to ink truncate-middle)',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-middle' }, 'Hello World'),
      ),
    () => (
      <Box width={7} textWrap="middle">
        <Text>Hello World</Text>
      </Box>
    ),
  );
});
