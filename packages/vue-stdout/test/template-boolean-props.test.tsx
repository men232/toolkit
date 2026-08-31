import type { Component, VNode } from 'vue';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import * as catalog from '../src/components';
import { Box, Static, Text, Transform } from '../src/components';
import {
  BOOLEAN_PROP_KEYS,
  castBooleanProps,
  type BooleanPropKey,
} from '../src/components/booleanProps';
import { renderToString } from '../src/renderToString';
import BareBold from './fixtures/BareBold.vue';
import BareBooleanProps from './fixtures/BareBooleanProps.vue';
import ExplicitBooleanProps from './fixtures/ExplicitBooleanProps.vue';
import NonBooleanProps from './fixtures/NonBooleanProps.vue';

const COLUMNS = 60;

const renderTree = (node: () => VNode): string =>
  renderToString({ render: node }, { columns: COLUMNS });

describe('a bare boolean attribute in a template', () => {
  it('paints what the same prop paints in JSX', () => {
    const jsx = renderTree(() => <Text bold>X</Text>);

    expect(renderToString(BareBold, { columns: COLUMNS })).toBe(jsx);
  });

  it('paints what `:prop="true"` paints, across the whole catalog', () => {
    expect(renderToString(BareBooleanProps, { columns: COLUMNS })).toBe(
      renderToString(ExplicitBooleanProps, { columns: COLUMNS }),
    );
  });
});

/**
 * A fix for `bold` that left `italic` broken would be worse than no fix, so
 * coverage here is enumerated rather than sampled: the cases come from
 * `BOOLEAN_PROP_KEYS` itself, and `src/components/booleanProps.test-d.ts`
 * proves that list is exactly the catalog's boolean props. Adding a boolean
 * prop and not handling it fails the type test; handling it in the list but not
 * in the component fails here.
 *
 * Each harness renders one prop through its real component. Nothing is asserted
 * about *which* bytes it produces — only that the bare form is
 * indistinguishable from `true`, and that the harness can tell the two boolean
 * values apart at all. That second assertion is what keeps a harness from
 * passing vacuously: `borderTop` and friends default to *on*, so `true` and the
 * empty string agree with the default and with each other. Comparing `true`
 * against `false` proves the prop is reaching the paint pass regardless.
 */
type Harness = (value: unknown) => string;

const textHarness =
  (key: BooleanPropKey): Harness =>
  value =>
    renderTree(() => h(Text as Component, { [key]: value }, () => 'sample'));

const borderHarness =
  (key: BooleanPropKey): Harness =>
  value =>
    renderTree(() =>
      h(
        Box as Component,
        { borderStyle: 'round', borderColor: 'green', width: 20, [key]: value },
        () => h(Text as Component, null, () => 'x'),
      ),
    );

const progressHarness =
  (key: BooleanPropKey): Harness =>
  value =>
    renderTree(() =>
      h(Box as Component, { width: 24 }, () =>
        h(catalog.ProgressBar as Component, { value: 50, [key]: value }),
      ),
    );

const harnesses: Record<BooleanPropKey, Harness> = {
  bold: textHarness('bold'),
  italic: textHarness('italic'),
  underline: textHarness('underline'),
  strikethrough: textHarness('strikethrough'),
  inverse: textHarness('inverse'),
  dimColor: textHarness('dimColor'),
  borderTop: borderHarness('borderTop'),
  borderBottom: borderHarness('borderBottom'),
  borderLeft: borderHarness('borderLeft'),
  borderRight: borderHarness('borderRight'),
  borderDimColor: borderHarness('borderDimColor'),
  borderTopDimColor: borderHarness('borderTopDimColor'),
  borderBottomDimColor: borderHarness('borderBottomDimColor'),
  borderLeftDimColor: borderHarness('borderLeftDimColor'),
  borderRightDimColor: borderHarness('borderRightDimColor'),
  showPercent: progressHarness('showPercent'),
};

describe('every boolean prop on the catalog', () => {
  it('has a harness — the enumeration is complete', () => {
    expect(Object.keys(harnesses).sort()).toEqual([...BOOLEAN_PROP_KEYS].sort());
  });

  for (const key of BOOLEAN_PROP_KEYS) {
    describe(key, () => {
      const render = harnesses[key];

      it('is observable at all', () => {
        expect(render(true)).not.toBe(render(false));
      });

      it('treats a bare attribute as `true`', () => {
        expect(render('')).toBe(render(true));
      });

      it('leaves every other value alone', () => {
        expect(render(false)).toBe(render(false));
        expect(render(undefined)).toBe(render(undefined));
        expect(render(true)).not.toBe(render(false));
      });
    });
  }
});

/**
 * The enumeration above is only exhaustive over the components
 * `booleanProps.test-d.ts` names. This pins the exported set so adding a
 * component cannot quietly escape both.
 */
it('the exported catalog has not grown a component outside the proof', () => {
  expect(Object.keys(catalog).sort()).toEqual(
    [
      'Box',
      'ErrorBoundary',
      'NewLine',
      'ProgressBar',
      'Spacer',
      'Static',
      'Text',
      'Transform',
    ].sort(),
  );
  // Adding one? Add its props type to `CatalogProps` in
  // `src/components/booleanProps.test-d.ts`, and — if it has boolean props — a
  // harness above and a `castBooleanProps` call in the component itself.
});

/**
 * The other half of the fix: nothing that is *not* a boolean may have changed.
 * This is where the all-or-nothing props-declaration trap would surface, since
 * a declaration naming only the booleans routes every other prop into `attrs`
 * and out of the component's own `{...props}` spread.
 */
describe('non-boolean props', () => {
  it('reach the paint pass identically from a template and from JSX', () => {
    const items = ['one', 'two'];

    const jsx = renderTree(() => (
      <Box
        flexDirection="column"
        width={40}
        paddingX={2}
        borderStyle="double"
        borderColor="magenta"
      >
        <Text color="green" backgroundColor="blue">
          colored
        </Text>
        <Text color="#ff8800">truecolor</Text>
        <Text wrap="truncate-end">
          a rather long line that has to be truncated somewhere
        </Text>
        <Box flexGrow={1} justifyContent="flex-end" alignItems="center" width="50%">
          <Text>grown</Text>
        </Box>
        <Box marginTop={1} gap={2} flexDirection="row">
          <Text>l</Text>
          <Text>r</Text>
        </Box>
        <Transform transform={(output: string) => `[${output}]`}>
          <Text>wrapped</Text>
        </Transform>
        {/* `h()` rather than JSX children: `<Static>`'s slot is a *scoped*
            slot, and `StaticProps` deliberately declares no `children`, so the
            JSX-children form does not type-check. Same shape
            `test/static.test.ts` uses. */}
        {h(Static as Component, { items }, {
          default: ({ item, index }: { item: unknown; index: number }) =>
            h(Text as Component, { key: index, color: 'cyan' }, () =>
              `${index}:${String(item)}`,
            ),
        })}
      </Box>
    ));

    expect(renderToString(NonBooleanProps, { columns: COLUMNS })).toBe(jsx);
  });

  it('pass through the cast by identity when nothing needs casting', () => {
    const props = { color: 'green', width: 4, bold: true, borderTop: false };

    // Identity, not deep equality: on the path every JSX render and every
    // bound template takes, the cast must neither allocate nor be able to
    // reorder or drop a key.
    expect(castBooleanProps(props)).toBe(props);
  });

  it('keeps every non-boolean key when a boolean *does* need casting', () => {
    const cast = castBooleanProps({
      bold: '',
      color: 'green',
      width: 4,
      borderStyle: 'round',
    });

    expect(cast).toEqual({
      bold: true,
      color: 'green',
      width: 4,
      borderStyle: 'round',
    });
  });

  it('leaves an empty string on a non-boolean prop exactly as it arrived', () => {
    // `castBooleanProps` scans the props object's own keys rather than reading
    // all sixteen boolean names off it -- 0.118 us per component against
    // 0.0099, because Vue hands a functional component a `shallowReadonly`
    // Proxy in a development build and each of those reads is a trap. The
    // direction it scans in is the whole difference between "cast a boolean
    // that arrived as ''" and "cast anything that arrived as ''", and the
    // second one turns `<Box border-color="">` into `borderColor: true`.
    //
    // The old shape could not get this wrong; this one can, so it is pinned
    // here. Deleting the key-set check leaves every other case in this file
    // green.
    const props = { borderColor: '', width: '', bold: '' };

    expect(castBooleanProps(props)).toEqual({
      borderColor: '',
      width: '',
      bold: true,
    });
  });

  it('leaves an absent boolean absent rather than defaulting it to false', () => {
    // A runtime `Boolean` props declaration would have made this `false`, and
    // `borderTop: false` erases a border (`props.borderTop !== false`,
    // `src/tree/render.ts`). See `booleanProps.ts`.
    expect('borderTop' in castBooleanProps({ borderStyle: 'round' })).toBe(
      false,
    );
  });
});
