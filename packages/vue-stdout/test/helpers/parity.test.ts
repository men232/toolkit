import React from 'react';
import { Box, Text } from 'ink';
import { describe, expect, it } from 'vitest';
import { h } from 'vue';
import { Text as VueText } from '../../src';
import { renderInk, runParityFailureCase } from './parity';

describe('renderInk', () => {
  it('renders ink to a string', () => {
    expect(
      renderInk(React.createElement(Text, null, 'hello'), 20),
    ).toBe('hello');
  });

  it('reproduces the measured border case from spec 4.1', () => {
    const output = renderInk(
      React.createElement(
        Box,
        { borderStyle: 'round' },
        React.createElement(Text, null, 'hi'),
      ),
      10,
    );

    expect(output).toBe('╭────────╮\n│hi      │\n╰────────╯');
  });
});

// The red-case mechanism distinguishes "vue-stdout's output genuinely differs
// from ink's" (a legitimate pending divergence) from "the code threw" (should
// never be swallowed as one). Neither property has a call site to exercise it
// right now -- the backlog is empty, every red case having been promoted -- so
// it is tested directly here rather than resting on inspection alone. The next
// red case registered will lean on this working correctly.
describe('runParityFailureCase (expectParityFails\' assertion body)', () => {
  it('does not throw when vue genuinely mismatches ink -- a legitimate pending divergence', () => {
    expect(() =>
      runParityFailureCase(
        { columns: 20 },
        () => React.createElement(Text, null, 'expected'),
        () => h(VueText, null, () => 'actual'),
      ),
    ).not.toThrow();
  });

  it('throws once vue happens to already match ink -- the signal to promote the case', () => {
    expect(() =>
      runParityFailureCase(
        { columns: 20 },
        () => React.createElement(Text, null, 'same'),
        () => h(VueText, null, () => 'same'),
      ),
    ).toThrow();
  });

  it('propagates a crash unmasked, rather than swallowing it as a known gap', () => {
    // The property `it.fails` gets wrong: it would count this as "expected
    // failure" too, indistinguishable from a genuine mismatch, silently
    // masking a totally unrelated regression as if it were this case's
    // known bug. This asserts the original error surfaces intact instead.
    expect(() =>
      runParityFailureCase(
        { columns: 20 },
        () => React.createElement(Text, null, 'x'),
        () => {
          throw new Error('unrelated crash, not a mismatch');
        },
      ),
    ).toThrow('unrelated crash, not a mismatch');
  });
});
