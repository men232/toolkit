import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

const cases = [
  { name: 'padding', props: { padding: 1 } },
  { name: 'paddingX', props: { paddingX: 2 } },
  { name: 'paddingY', props: { paddingY: 1 } },
  { name: 'paddingTop', props: { paddingTop: 2 } },
  { name: 'margin', props: { margin: 1 } },
  { name: 'marginX', props: { marginX: 2 } },
  { name: 'marginLeft', props: { marginLeft: 3 } },
] as const;

describe('parity: spacing', () => {
  for (const { name, props } of cases) {
    expectParity(
      name,
      { columns: 20 },
      () => e(InkBox, props, e(InkText, null, 'a'), e(InkText, null, 'b')),
      () => (
        <Box {...props}>
          <Text>a</Text>
          <Text>b</Text>
        </Box>
      ),
    );
  }

  // Was an `it.fails` under the retired render tree: Yoga-level `gap` was set
  // on the Box's node, but a Box holding only inline <Text> children laid out
  // through the synthetic `RenderInline` flow, which never read it. Laying out
  // over the DOM tree puts the Box's own node back in charge.
  expectParity(
    'gap',
    { columns: 20 },
    () => e(InkBox, { gap: 2 }, e(InkText, null, 'a'), e(InkText, null, 'b')),
    () => (
      <Box gap={2}>
        <Text>a</Text>
        <Text>b</Text>
      </Box>
    ),
  );
});
