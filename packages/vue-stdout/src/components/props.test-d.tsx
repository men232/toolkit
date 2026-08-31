import { expectTypeOf, test } from 'vitest';
import { Box, type BoxProps } from './Box';
import { Text, type TextProps } from './Text';

// Successor to `src/jsx.test-d.tsx`, which pinned the same three properties on
// the intrinsic-element surface (`StdoutIntrinsicElements['box']` and
// `['span']`, and `<box>` written literally in JSX). That surface is gone: the
// host tags are private and this package no longer augments
// `GlobalComponents` or `JSX.IntrinsicElements`. The properties themselves are
// unchanged and still worth pinning — they just belong to the components now,
// which are the only authoring surface a consumer has.

test('the authoring props are typed', () => {
  expectTypeOf<BoxProps>().toHaveProperty('borderStyle');
  expectTypeOf<TextProps>().toHaveProperty('color');
});

// Regression test for a real consumer usage, not just the interface shape.
// `BoxProps['children']` is what makes literal JSX children typecheck, and its
// absence was invisible from inside this package for as long as `Box.tsx` only
// ever spread an attributes object (TypeScript skips excess-property checking
// on spread JSX attributes). Writing the children out literally here is the
// whole point of the test.
test('<Box> accepts valid props and literal JSX children', () => {
  const el = (
    <Box borderStyle="round">
      <Text>hi</Text>
    </Box>
  );

  expectTypeOf(el).not.toBeAny();
});

test('<Box> rejects an invalid prop value', () => {
  // @ts-expect-error borderStyle must be a BoxStyle/Boxes key, not a number
  const el = <Box borderStyle={123} />;

  expectTypeOf(el).not.toBeAny();
});
