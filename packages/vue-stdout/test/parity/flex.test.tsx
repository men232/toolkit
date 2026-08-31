import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

// These were `it.fails` under the retired render tree: a Box whose only
// children were inline <Text> nodes laid out through a synthetic
// `RenderInline` flow rather than the Box's own Yoga node, so `flexDirection`,
// `justifyContent`, `alignItems` and `gap` were applied to a node nothing
// consulted. Laying out over the DOM tree means the Box's own Yoga node is the
// one that positions its children, and these now match ink.
const flexCases = [
  { name: 'flexDirection=column', props: { flexDirection: 'column' } },
  {
    name: 'flexDirection=row-reverse',
    props: { flexDirection: 'row-reverse' },
  },
  {
    name: 'justifyContent=center',
    props: { justifyContent: 'center', width: 12 },
  },
  {
    name: 'justifyContent=space-between',
    props: { justifyContent: 'space-between', width: 12 },
  },
  { name: 'alignItems=center', props: { alignItems: 'center', height: 3 } },
] as const;

describe('parity: flex', () => {
  for (const { name, props } of flexCases) {
    expectParity(
      name,
      { columns: 20 },
      () =>
        e(InkBox, props as any, e(InkText, null, 'aa'), e(InkText, null, 'bb')),
      () => (
        <Box {...(props as any)}>
          <Text>aa</Text>
          <Text>bb</Text>
        </Box>
      ),
    );
  }

  expectParity(
    'flexWrap=wrap',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { flexWrap: 'wrap', width: 4 } as any,
        e(InkText, null, 'aa'),
        e(InkText, null, 'bb'),
      ),
    () => (
      <Box flexWrap="wrap" width={4}>
        <Text>aa</Text>
        <Text>bb</Text>
      </Box>
    ),
  );

  // Divergence 4.2#2, and this comment is its record: our `flexShrink: 0`
  // default (ink uses `1`) means two border boxes that don't fit a fixed-height
  // column overflow it instead of being squeezed to fit. ink's squeeze writes
  // the second box's text over its own bottom border; ours stays readable --
  // which is the measurement that justifies keeping it, and the snapshot below
  // is what it looks like. The marker is opaque (see `ParityOptions.diverges`);
  // it was a row number in a design spec that no longer exists.
  expectParity(
    'flexShrink diverges: bordered boxes overflow a fixed-height column instead of shrinking to fit',
    { columns: 20, diverges: '4.2#2' },
    () =>
      e(
        InkBox,
        {
          flexDirection: 'column',
          height: 5,
          justifyContent: 'space-between',
        },
        e(InkBox, { borderStyle: 'single' }, e(InkText, null, 'a')),
        e(InkBox, { borderStyle: 'single' }, e(InkText, null, 'b')),
      ),
    () => (
      <Box flexDirection="column" height={5} justifyContent="space-between">
        <Box borderStyle="single">
          <Text>a</Text>
        </Box>
        <Box borderStyle="single">
          <Text>b</Text>
        </Box>
      </Box>
    ),
  );
});
