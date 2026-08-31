import React from 'react';
import {
  Box as InkBox,
  Spacer as InkSpacer,
  Text as InkText,
} from 'ink';
import { describe } from 'vitest';
import { Box, Spacer, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

describe('parity: Spacer', () => {
  expectParity(
    'pushes siblings to opposite edges',
    { columns: 20 },
    () =>
      e(
        InkBox,
        null,
        e(InkText, null, 'a'),
        e(InkSpacer, null),
        e(InkText, null, 'b'),
      ),
    () => (
      <Box>
        <Text>a</Text>
        <Spacer />
        <Text>b</Text>
      </Box>
    ),
  );

  expectParity(
    'stacks in a column when flexDirection is column',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { flexDirection: 'column', height: 4 },
        e(InkText, null, 'a'),
        e(InkSpacer, null),
        e(InkText, null, 'b'),
      ),
    () => (
      <Box flexDirection="column" height={4}>
        <Text>a</Text>
        <Spacer />
        <Text>b</Text>
      </Box>
    ),
  );
});
