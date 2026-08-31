import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

// `position` never had a single parity case before this file.
// Mirrors ink's own `test/position.tsx` (top/left, bottom/right, percentage
// offsets, relative-keeps-flow, static-ignores-offsets), plus one case that
// isn't in ink's own suite: an absolutely-positioned child painted so that it
// overlaps a later sibling, where paint order (not just layout) has to match.

describe('parity: position', () => {
  expectParity(
    'absolute with top/left offsets',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 5, height: 3 },
        e(InkBox, { position: 'absolute', top: 1, left: 2 }, e(InkText, null, 'X')),
      ),
    () => (
      <Box width={5} height={3}>
        <Box position="absolute" top={1} left={2}>
          <Text>X</Text>
        </Box>
      </Box>
    ),
  );

  expectParity(
    'absolute with bottom/right offsets',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 6, height: 4 },
        e(
          InkBox,
          { position: 'absolute', bottom: 1, right: 1 },
          e(InkText, null, 'X'),
        ),
      ),
    () => (
      <Box width={6} height={4}>
        <Box position="absolute" bottom={1} right={1}>
          <Text>X</Text>
        </Box>
      </Box>
    ),
  );

  expectParity(
    'absolute with percentage offsets',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 6, height: 4 },
        e(
          InkBox,
          { position: 'absolute', top: '50%', left: '50%' },
          e(InkText, null, 'X'),
        ),
      ),
    () => (
      <Box width={6} height={4}>
        <Box position="absolute" top="50%" left="50%">
          <Text>X</Text>
        </Box>
      </Box>
    ),
  );

  expectParity(
    'relative offsets visual position while keeping flow',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 5 },
        e(InkBox, { position: 'relative', left: 2 }, e(InkText, null, 'A')),
        e(InkText, null, 'B'),
      ),
    () => (
      <Box width={5}>
        <Box position="relative" left={2}>
          <Text>A</Text>
        </Box>
        <Text>B</Text>
      </Box>
    ),
  );

  expectParity(
    'static ignores offsets',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 5 },
        e(InkBox, { position: 'static', left: 2 }, e(InkText, null, 'A')),
        e(InkText, null, 'B'),
      ),
    () => (
      <Box width={5}>
        <Box position="static" left={2}>
          <Text>A</Text>
        </Box>
        <Text>B</Text>
      </Box>
    ),
  );

  // Paint order, not just layout: the absolutely-positioned box comes second
  // in document order, so it must be painted on top of (i.e. overwrite) the
  // full-width sibling that came first, exactly the way ink's own renderer
  // walks children in document order rather than reordering by position.
  expectParity(
    'absolutely-positioned child overlaps a preceding sibling',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 5, height: 1 },
        e(InkText, null, 'ABCDE'),
        e(InkBox, { position: 'absolute', top: 0, left: 2 }, e(InkText, null, 'X')),
      ),
    () => (
      <Box width={5} height={1}>
        <Text>ABCDE</Text>
        <Box position="absolute" top={0} left={2}>
          <Text>X</Text>
        </Box>
      </Box>
    ),
  );
});
