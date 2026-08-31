import React from 'react';
import { Box as InkBox, Text as InkText } from 'ink';
import { describe } from 'vitest';
import { Box, Text } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

const styles = ['single', 'double', 'round', 'bold', 'classic'] as const;

describe('parity: borders', () => {
  for (const borderStyle of styles) {
    expectParity(
      `borderStyle=${borderStyle}`,
      { columns: 20 },
      () => e(InkBox, { borderStyle }, e(InkText, null, 'hi')),
      () => (
        <Box borderStyle={borderStyle}>
          <Text>hi</Text>
        </Box>
      ),
    );
  }

  expectParity(
    'border with borderColor',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { borderStyle: 'round', borderColor: 'green' },
        e(InkText, null, 'hi'),
      ),
    () => (
      <Box borderStyle="round" borderColor="green">
        <Text>hi</Text>
      </Box>
    ),
  );

  expectParity(
    'border sides disabled',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { borderStyle: 'round', borderTop: false, borderBottom: false },
        e(InkText, null, 'hi'),
      ),
    () => (
      <Box borderStyle="round" borderTop={false} borderBottom={false}>
        <Text>hi</Text>
      </Box>
    ),
  );
});
