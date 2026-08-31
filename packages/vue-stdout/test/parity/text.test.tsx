import React from 'react';
import { Box as InkBox, Newline as InkNewline, Text as InkText } from 'ink';
import { describe, expect, it } from 'vitest';
import { Box, NewLine, Text } from '../../src';
import { expectParity, renderInk, renderVue } from '../helpers/parity';

// JSX in this file compiles to Vue's h(). The ink side must be built with
// React.createElement explicitly — see Global Constraints.
const e = React.createElement;

describe('parity: text', () => {
  expectParity(
    'plain text',
    { columns: 20 },
    () => e(InkText, null, 'hello'),
    () => <Text>hello</Text>,
  );

  expectParity(
    'two sibling texts',
    { columns: 20 },
    () => e(InkBox, null, e(InkText, null, 'aa'), e(InkText, null, 'bb')),
    () => (
      <Box>
        <Text>aa</Text>
        <Text>bb</Text>
      </Box>
    ),
  );

  expectParity(
    'single long text wraps',
    { columns: 20 },
    () => e(InkBox, { width: 9 }, e(InkText, null, 'hello world again')),
    () => (
      <Box width={9}>
        <Text>hello world again</Text>
      </Box>
    ),
  );

  // Nested styles are squashed together: this is ink's text model, adopted
  // deliberately -- `<Text>` collapses its whole subtree into one styled string
  // with a single Yoga node, which is what makes `bold` survive an inner
  // `color` and what `<Transform>` needs to see the string whole.
  expectParity(
    'nested Text inherits outer style',
    { columns: 20 },
    () => e(InkText, { bold: true }, e(InkText, { color: 'green' }, 'x')),
    () => (
      <Text bold>
        <Text color="green">x</Text>
      </Text>
    ),
  );

  // Divergence 4.2#1, and this comment is its record: our inline flow wraps at
  // node boundaries where ink's `flexShrink: 1` squeezes adjacent `<Text>` into
  // garbage (`"hellworld\n\n    again"` for a 9-wide box). Ours is better, and
  // that is the measurement. The default is confined to the row axis, where it
  // pays off -- `restrictWrapToRowAxis` in `src/tree/layout.ts` carries that
  // argument. The marker is opaque (see `ParityOptions.diverges`); it was a row
  // number in a design spec that no longer exists.
  expectParity(
    'sibling texts in a narrow box diverge on purpose',
    { columns: 20, diverges: '4.2#1' },
    () =>
      e(
        InkBox,
        { width: 5 },
        e(InkText, null, 'aaa'),
        e(InkText, null, 'bbb'),
      ),
    () => (
      <Box width={5}>
        <Text>aaa</Text>
        <Text>bbb</Text>
      </Box>
    ),
  );

  // `<Text wrap>` maps onto the `textWrap` attribute the layout engine reads
  // (`getTextWrapStyle`, `src/tree/layout.ts`) -- previously `Text.tsx` spread
  // `wrap` straight through unrenamed, so it never reached the engine and
  // this prop did nothing at all.
  expectParity(
    'wrap prop set directly on Text',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 7 },
        e(InkText, { wrap: 'truncate-end' }, 'Hello World'),
      ),
    () => (
      <Box width={7}>
        <Text wrap="truncate-end">Hello World</Text>
      </Box>
    ),
  );

  // `<Text>a<NewLine />b</Text>` is a <stdout-text> holding a text run, an element,
  // and another text run. Text and element children are merged into one
  // inline flow, so the bare 'a' and 'b' runs get a box too.
  expectParity(
    'newline between texts',
    { columns: 20 },
    () => e(InkText, null, 'a', e(InkNewline, null), 'b'),
    () => (
      <Text>
        a<NewLine />b
      </Text>
    ),
  );
});
