import React from 'react';
import {
  Box as InkBox,
  Text as InkText,
  Transform as InkTransform,
} from 'ink';
import { describe } from 'vitest';
import { Box, Text, Transform } from '../../src';
import { expectParity } from '../helpers/parity';

const e = React.createElement;

const uppercase = (s: string) => s.toUpperCase();
const brackets = (s: string, index: number) => `[${index}] ${s}`;
const reverse = (s: string) => [...s].reverse().join('');

describe('parity: Transform', () => {
  // `reverse`, not `uppercase`, is the point here: reversing each text node
  // independently ('oof' + 'rab') would read differently from reversing the
  // whole joined string ('raboof') -- the only way this case can pass is if
  // the transform sees the squashed subtree as one string, not per node.
  expectParity(
    'transforms the whole squashed string, not per text node',
    { columns: 20 },
    () =>
      e(
        InkTransform,
        { transform: reverse },
        e(InkText, null, 'foo'),
        e(InkText, null, 'bar'),
      ),
    () => (
      <Transform transform={reverse}>
        <Text>foo</Text>
        <Text>bar</Text>
      </Transform>
    ),
  );

  expectParity(
    'receives the line index as the second argument',
    { columns: 20 },
    () =>
      e(
        InkBox,
        { flexDirection: 'column' },
        e(InkTransform, { transform: brackets }, e(InkText, null, 'one')),
        e(InkTransform, { transform: brackets }, e(InkText, null, 'two')),
      ),
    () => (
      <Box flexDirection="column">
        <Transform transform={brackets}>
          <Text>one</Text>
        </Transform>
        <Transform transform={brackets}>
          <Text>two</Text>
        </Transform>
      </Box>
    ),
  );

  expectParity(
    'composes with an ancestor color, wrapping the transformed result',
    { columns: 20 },
    () =>
      e(
        InkText,
        { color: 'green' },
        e(InkTransform, { transform: uppercase }, e(InkText, null, 'hi')),
      ),
    () => (
      <Text color="green">
        <Transform transform={uppercase}>
          <Text>hi</Text>
        </Transform>
      </Text>
    ),
  );
});
