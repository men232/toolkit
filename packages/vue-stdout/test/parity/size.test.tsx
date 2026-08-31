import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

const cases = [
  { name: 'height number', props: { height: 3 } },
  { name: 'overflow hidden', props: { width: 3, overflow: 'hidden' } },
] as const;

describe('parity: size', () => {
  for (const { name, props } of cases) {
    expectParity(
      name,
      { columns: 20 },
      () => e(InkBox, props as any, e(InkText, null, 'content')),
      () => (
        <Box {...(props as any)}>
          <Text>content</Text>
        </Box>
      ),
    );
  }

  // These four used to render exactly `"content"` regardless of the sized
  // property under test -- ink and vue-stdout only differ in how a box gets
  // its dimensions, never in what a single line of unwrapped text looks
  // like, so all four passed or failed together and carried about one case
  // worth of discrimination between them. Each now has a trailing marker
  // sibling (`|`) in a row; the marker's column position is a direct readout
  // of how wide the sized box actually resolved to, so a regression in any
  // one of these properties changes that case's own output.

  // `width={10}` on a box holding 7-character content: 3 columns of padding
  // before the marker.
  expectParity(
    'width number',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { flexDirection: 'row' },
        e(InkBox, { width: 10 }, e(InkText, null, 'content')),
        e(InkText, null, '|'),
      ),
    () => (
      <Box flexDirection="row">
        <Box width={10}>
          <Text>content</Text>
        </Box>
        <Text>|</Text>
      </Box>
    ),
  );

  // `width="50%"` of a 20-wide container resolves to the same 10 columns as
  // the case above, but through percentage resolution rather than a literal.
  expectParity(
    'width percent',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 20, flexDirection: 'row' },
        e(InkBox, { width: '50%' }, e(InkText, null, 'content')),
        e(InkText, null, '|'),
      ),
    () => (
      <Box width={20} flexDirection="row">
        <Box width="50%">
          <Text>content</Text>
        </Box>
        <Text>|</Text>
      </Box>
    ),
  );

  // `minWidth={12}` forces a box wider than its 7-character content would
  // otherwise size it to; the marker reveals the extra 5 columns.
  expectParity(
    'minWidth',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { flexDirection: 'row' },
        e(InkBox, { minWidth: 12 }, e(InkText, null, 'content')),
        e(InkText, null, '|'),
      ),
    () => (
      <Box flexDirection="row">
        <Box minWidth={12}>
          <Text>content</Text>
        </Box>
        <Text>|</Text>
      </Box>
    ),
  );

  // `flexGrow={1}` in a 20-wide row expands the box to consume the space the
  // marker doesn't need, pushing the marker to the row's last column -- a
  // content-sized box (no `flexGrow`) would instead leave the marker right
  // after "content".
  expectParity(
    'flexGrow',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { width: 20, flexDirection: 'row' },
        e(InkBox, { flexGrow: 1 }, e(InkText, null, 'content')),
        e(InkText, null, '|'),
      ),
    () => (
      <Box width={20} flexDirection="row">
        <Box flexGrow={1}>
          <Text>content</Text>
        </Box>
        <Text>|</Text>
      </Box>
    ),
  );

  // A hidden box next to a visible sibling: `hidden` must contribute
  // nothing to the output while `visible` still renders. Unlike a bare
  // `display: 'none'` box on its own (ink renders that to `""`), this
  // gives the assertion a non-empty expected value, so it actually
  // discriminates a regression instead of comparing `"" === ""`.
  expectParity(
    'display=none has a visible sibling',
    { columns: 20 },
    () =>
      e(
        InkBox,
        null,
        e(InkBox, { display: 'none' }, e(InkText, null, 'hidden')),
        e(InkText, null, 'visible'),
      ),
    () => (
      <Box>
        <Box display="none">
          <Text>hidden</Text>
        </Box>
        <Text>visible</Text>
      </Box>
    ),
  );

  // A child of a fixed-width column fills that width -- `alignItems: stretch`
  // is the CSS default and ink inherits it. Needs a bordered child, so the
  // stretch is actually visible in the output. This regressed when rendering
  // moved onto the DOM tree: our `flexWrap: wrap` default makes `alignContent`
  // the property that sizes a flex line, and it was reset to Yoga's FLEX_START
  // (content-sized) rather than CSS's `stretch`.
  expectParity(
    'children stretch across the cross axis of a column',
    { columns: 40 },
    () =>
      e(
        InkBox,
        { width: 40, flexDirection: 'column' },
        e(InkBox, { borderStyle: 'round' }, e(InkText, null, 'content')),
      ),
    () => (
      <Box width={40} flexDirection="column">
        <Box borderStyle="round">
          <Text>content</Text>
        </Box>
      </Box>
    ),
  );

  // The clip an `overflow: hidden` box pushes must be popped once its own
  // subtree is painted. `RenderBlock` pushed and never popped, so the sibling
  // below vanished from the frame entirely.
  expectParity(
    'overflow hidden does not clip a later sibling',
    { columns: 40 },
    () =>
      e(
        InkBox,
        { flexDirection: 'column' },
        e(
          InkBox,
          { width: 3, overflow: 'hidden' },
          e(InkText, null, 'clipped-content'),
        ),
        e(InkBox, null, e(InkText, null, 'sibling-after-the-clip')),
      ),
    () => (
      <Box flexDirection="column">
        <Box width={3} overflow="hidden">
          <Text>clipped-content</Text>
        </Box>
        <Box>
          <Text>sibling-after-the-clip</Text>
        </Box>
      </Box>
    ),
  );
});
