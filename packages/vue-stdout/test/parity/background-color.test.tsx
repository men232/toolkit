import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

// Element-level `backgroundColor` (ink: `render-background.ts`) had no
// parity case at all before this file — it was not implemented. It is paint
// (a rectangle fill applied before borders and children, in the same layer
// every other visible property is compared through), so it belongs in the
// parity count like `borders.test.tsx`/`spacing.test.tsx`.
//
// ink also lets a `<Text>` descendant with no `backgroundColor` of its own
// inherit one from an ancestor `<Box>` through React context
// (`BackgroundContext.tsx`), so its own glyphs carry the color too, not just
// the cells around them (`Layer.write` replaces a cell outright rather than
// layering under it, so without this a plain `<Text>` on a colored `<Box>`
// would punch a color-less hole in the fill wherever its glyphs land). This
// was initially left out of scope and only disclosed in prose; review
// reproduced it as a genuine byte-level mismatch, so it is now ported too —
// see `getInheritedBackgroundColor` (`src/tree/utils/textTransformers.ts`).
// The cases below cover both the fill and this inheritance.

describe('parity: background-color', () => {
  expectParity(
    'fills the content area of a childless box',
    { columns: 20 },
    () => e(InkBox, { width: 6, height: 2, backgroundColor: 'red' }),
    () => <Box width={6} height={2} backgroundColor="red" />,
  );

  expectParity(
    'excludes the border from the fill',
    { columns: 20 },
    () =>
      e(InkBox, {
        width: 6,
        height: 3,
        borderStyle: 'round',
        backgroundColor: 'green',
      }),
    () => (
      <Box width={6} height={3} borderStyle="round" backgroundColor="green" />
    ),
  );

  expectParity(
    'a disabled border side still excludes only the shown borders',
    { columns: 20 },
    () =>
      e(InkBox, {
        width: 6,
        height: 3,
        borderStyle: 'round',
        borderTop: false,
        backgroundColor: 'yellow',
      }),
    () => (
      <Box
        width={6}
        height={3}
        borderStyle="round"
        borderTop={false}
        backgroundColor="yellow"
      />
    ),
  );

  expectParity(
    'shows through around a childless nested box',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 10, height: 3, backgroundColor: 'magenta' },
        e(InkBox, { width: 4, height: 1 }),
      ),
    () => (
      <Box width={10} height={3} backgroundColor="magenta">
        <Box width={4} height={1} />
      </Box>
    ),
  );

  expectParity(
    'hex color',
    { columns: 20 },
    () => e(InkBox, { width: 6, height: 2, backgroundColor: '#00ff00' }),
    () => <Box width={6} height={2} backgroundColor="#00ff00" />,
  );

  expectParity(
    'rgb color',
    { columns: 20 },
    () =>
      e(InkBox, { width: 6, height: 2, backgroundColor: 'rgb(10, 20, 30)' }),
    () => <Box width={6} height={2} backgroundColor="rgb(10, 20, 30)" />,
  );

  expectParity(
    'a text child with a matching backgroundColor of its own paints over the fill consistently',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 10, backgroundColor: 'blue' },
        e(InkText, { backgroundColor: 'blue' }, 'hi'),
      ),
    () => (
      <Box width={10} backgroundColor="blue">
        <Text backgroundColor="blue">hi</Text>
      </Box>
    ),
  );

  expectParity(
    'a plain text child with no backgroundColor of its own inherits the parent box fill',
    { columns: 20 },
    () =>
      e(InkBox, { width: 10, backgroundColor: 'blue' }, e(InkText, null, 'hi')),
    () => (
      <Box width={10} backgroundColor="blue">
        <Text>hi</Text>
      </Box>
    ),
  );

  expectParity(
    'a text child with its own backgroundColor overrides the inherited fill',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 10, backgroundColor: 'blue' },
        e(InkText, { backgroundColor: 'red' }, 'hi'),
      ),
    () => (
      <Box width={10} backgroundColor="blue">
        <Text backgroundColor="red">hi</Text>
      </Box>
    ),
  );

  expectParity(
    'inheritance skips a nested box with no backgroundColor of its own',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 10, backgroundColor: 'blue' },
        e(InkBox, null, e(InkText, null, 'hi')),
      ),
    () => (
      <Box width={10} backgroundColor="blue">
        <Box>
          <Text>hi</Text>
        </Box>
      </Box>
    ),
  );
});
