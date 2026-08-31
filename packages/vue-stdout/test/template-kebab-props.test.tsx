import { readFileSync } from 'node:fs';
import type { Component, VNode } from 'vue';
import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import * as catalog from '../src/components';
import { Box, ProgressBar, Text } from '../src/components';
import {
  camelizeProps,
  KEBAB_PROP_KEYS,
  type KebabPropKey,
} from '../src/components/kebabProps';
import { renderToString } from '../src/renderToString';
import BareKebabBooleanProps from './fixtures/BareKebabBooleanProps.vue';
import CamelCatalogProps from './fixtures/CamelCatalogProps.vue';
import ExplicitBooleanProps from './fixtures/ExplicitBooleanProps.vue';
import KebabCatalogProps from './fixtures/KebabCatalogProps.vue';
import SpreadCamelProps from './fixtures/SpreadCamelProps.vue';
import SpreadKebabProps from './fixtures/SpreadKebabProps.vue';

const COLUMNS = 60;

const render = (component: unknown): string =>
  renderToString(component as never, { columns: COLUMNS });

const renderTree = (node: () => VNode): string =>
  renderToString({ render: node }, { columns: COLUMNS });

/** Vue's `hyphenate`, spelled out here so the test does not lean on the code under test. */
const hyphenate = (key: string): string =>
  key.replace(/\B([A-Z])/g, '-$1').toLowerCase();

/**
 * `<Box border-style="round">` used to paint no border, `<Box
 * flex-direction="column">` used to lay out as a row, and every other
 * multi-word prop on the catalog was dropped the same way — silently, and with
 * `vue-tsc`'s approval.
 *
 * The two fixtures are the same tree written twice, once in each spelling. The
 * comparison is only as good as the fixtures' coverage, so that coverage is
 * asserted below rather than eyeballed.
 */
describe('a hyphenated prop name in a template', () => {
  it('paints what the camelCase spelling paints, across the whole catalog', () => {
    expect(render(KebabCatalogProps)).toBe(render(CamelCatalogProps));
  });

  it('paints through `v-bind="obj"` too', () => {
    expect(render(SpreadKebabProps)).toBe(render(SpreadCamelProps));
  });
});

/**
 * The interaction with the bare-boolean fix (`booleanProps.ts`).
 *
 * `<Text dim-color>` is both defects at once: the key is `dim-color`, which
 * nothing reads, and the value is `""`, which is falsy. Only rewriting the key
 * *before* casting the value gets it to paint, so this is asserted on its own
 * rather than left implied by the catalog fixture.
 */
describe('a bare hyphenated boolean attribute', () => {
  it('paints what `:camelProp="true"` paints', () => {
    expect(render(BareKebabBooleanProps)).toBe(render(ExplicitBooleanProps));
  });

  it('is cast at the boundary in that order', () => {
    // The unit form of the same claim: the rewrite has to hand the cast a key
    // the cast recognises.
    expect(camelizeProps({ 'dim-color': '' })).toEqual({ dimColor: '' });
  });
});

/**
 * Completeness, enumerated rather than sampled.
 *
 * A fix that repaired `border-style` and left `flex-direction` inert would be
 * worse than none — the class would look handled — so every key is driven, and
 * the key list itself is proved to be exactly the catalog's multi-word props by
 * `src/components/kebabProps.test-d.ts`. Two independent halves:
 *
 * - every listed key is rewritten by `camelizeProps`, checked here directly;
 * - every listed key is actually *written* in both fixtures, so the rendering
 *   comparison above covers all of them end-to-end through the real components
 *   rather than through whichever handful the fixture author happened to type.
 */
describe('every multi-word prop on the camelized catalog', () => {
  const fixtureSource = (name: string): string =>
    readFileSync(new URL(`./fixtures/${name}.vue`, import.meta.url), 'utf8');

  const kebabFixture = fixtureSource('KebabCatalogProps');
  const camelFixture = fixtureSource('CamelCatalogProps');

  for (const key of KEBAB_PROP_KEYS) {
    describe(key, () => {
      it('is rewritten from its hyphenated spelling', () => {
        const sentinel = Symbol('value');

        expect(camelizeProps({ [hyphenate(key)]: sentinel })).toEqual({
          [key]: sentinel,
        });
      });

      it('is written both ways in the fixture pair', () => {
        // `="` so a prefix cannot count for its longer sibling —
        // `border-top` must not be satisfied by `border-top-color`.
        expect(kebabFixture).toContain(`${hyphenate(key)}="`);
        expect(camelFixture).toContain(`${key}="`);
      });
    });
  }
});

/**
 * `Box` and `Text` are the two components that route through `camelizeProps`;
 * the type proof shows nothing else has a multi-word prop to route, but it
 * cannot show that these two actually call it.
 */
describe('the components that route through the rewrite', () => {
  it('Box does', () => {
    const kebab = renderTree(() =>
      h(Box as Component, { 'border-style': 'round', width: 12 }, () =>
        h(Text as Component, null, () => 'x'),
      ),
    );
    const camel = renderTree(() =>
      h(Box as Component, { borderStyle: 'round', width: 12 }, () =>
        h(Text as Component, null, () => 'x'),
      ),
    );

    expect(kebab).toBe(camel);
    // Not vacuous: the prop has to be doing something for the pair to mean
    // anything.
    expect(camel).not.toBe(
      renderTree(() =>
        h(Box as Component, { width: 12 }, () =>
          h(Text as Component, null, () => 'x'),
        ),
      ),
    );
  });

  it('Text does', () => {
    const kebab = renderTree(() =>
      h(Text as Component, { 'background-color': 'blue' }, () => 'x'),
    );
    const camel = renderTree(() =>
      h(Text as Component, { backgroundColor: 'blue' }, () => 'x'),
    );

    expect(kebab).toBe(camel);
    expect(camel).not.toBe(renderTree(() => h(Text as Component, null, () => 'x')));
  });
});

/**
 * `ProgressBar` is the one catalog component that never needed this fix: it
 * declares `props` as a string array, and Vue camelizes both the declared names
 * and each incoming key when it has a declaration to match against. Measured
 * against Vue 3.5.13 with a bare probe (`props: ['showPercent', 'value']`,
 * `{ 'show-percent': '', value: 1 }` → `{ showPercent: '', value: 1 }`) and
 * pinned here through the real component, because the claim is load-bearing for
 * "kebab works everywhere".
 */
describe('ProgressBar gets its camelization from Vue', () => {
  const bar = (props: Record<string, unknown>): string =>
    renderTree(() =>
      h(Box as Component, { width: 24 }, () =>
        h(ProgressBar as Component, { value: 50, ...props }),
      ),
    );

  it('accepts the hyphenated spelling', () => {
    expect(bar({ 'show-percent': true })).toBe(bar({ showPercent: true }));
    expect(bar({ showPercent: true })).not.toBe(bar({}));
  });

  it('accepts a bare hyphenated boolean', () => {
    expect(bar({ 'show-percent': '' })).toBe(bar({ showPercent: true }));
  });

  /**
   * Vue only camelizes names it can see declared, so a prop missing from this
   * array is invisible in *both* spellings. The type side —
   * `keyof ProgressBarProps` equals the same names — is in
   * `src/components/kebabProps.test-d.ts`.
   */
  it('declares every prop its type has', () => {
    const declared = (ProgressBar as unknown as { props: string[] }).props;

    expect([...declared].sort()).toEqual(
      [
        'backgroundColor',
        'color',
        'max',
        'min',
        'showPercent',
        'value',
        'variant',
      ].sort(),
    );
  });
});

/**
 * The other half of the fix: nothing that was already working may have moved.
 * An over-broad key rewrite would surface here — in the spellings that were
 * never hyphenated, and in the keys that carry a hyphen without being props.
 */
describe('nothing else is rewritten', () => {
  it('passes props through by identity when no key is hyphenated', () => {
    const props = { borderStyle: 'round', color: 'green', width: 4 };

    // Identity, not deep equality: on the path every JSX render and every
    // camelCase template takes, the rewrite must neither allocate nor be able
    // to reorder or drop a key.
    expect(camelizeProps(props)).toBe(props);
  });

  it('leaves a hyphenated key that is not a catalog prop alone', () => {
    const props = {
      'data-thing': '1',
      'aria-label': 'x',
      'not-a-prop': true,
      'border-style': 'round',
    };

    expect(camelizeProps(props)).toEqual({
      'data-thing': '1',
      'aria-label': 'x',
      'not-a-prop': true,
      borderStyle: 'round',
    });
  });

  it('keeps every other key when one key is rewritten', () => {
    expect(
      camelizeProps({ 'border-style': 'round', color: 'green', width: 4 }),
    ).toEqual({ borderStyle: 'round', color: 'green', width: 4 });
  });

  it('resolves a prop spelled both ways to the last one written', () => {
    // Same rule as Vue's own `setFullProps`, which writes every matching key
    // into the one camelCase slot in iteration order.
    expect(
      camelizeProps({ 'border-style': 'round', borderStyle: 'double' }),
    ).toEqual({ borderStyle: 'double' });
    expect(
      camelizeProps({ borderStyle: 'double', 'border-style': 'round' }),
    ).toEqual({ borderStyle: 'round' });
  });

  it('is not fooled by an inherited property name', () => {
    // The alias table is a null-prototype object for this reason: a bare index
    // lookup on `constructor` or `toString` must not answer.
    const props = { constructor: 1, toString: 2 };

    expect(camelizeProps(props)).toBe(props);
  });

  it('renders the spread fixtures the same as the JSX that builds them', () => {
    const jsx = renderTree(() => (
      <Box width={40}>
        <Box
          borderStyle="round"
          borderColor="green"
          flexDirection="column"
          paddingX={1}
          marginTop={1}
        >
          <Text backgroundColor="blue" dimColor color="red">
            spread
          </Text>
        </Box>
      </Box>
    ));

    expect(render(SpreadCamelProps)).toBe(jsx);
    expect(render(SpreadKebabProps)).toBe(jsx);
  });
});

/**
 * The enumeration above is exhaustive only over the components
 * `kebabProps.test-d.ts` names. This pins the exported set so adding a
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
  // Adding one? Put its props type into `src/components/kebabProps.test-d.ts`
  // — into `CamelizedProps` if it spreads props onto a host element and takes
  // no runtime `props` declaration (and then call `camelizeProps` in it), or
  // into the "nothing to rewrite" assertion if every prop it takes is a single
  // word.
});

// Guards the harness itself: a `KebabPropKey` that stops being a string, or a
// list that empties, would make every enumerated test above pass vacuously.
it('the key list is non-empty and every entry has a distinct hyphenated form', () => {
  const keys: readonly KebabPropKey[] = KEBAB_PROP_KEYS;
  const hyphenated = keys.map(hyphenate);

  expect(keys.length).toBeGreaterThan(40);
  expect(new Set(hyphenated).size).toBe(keys.length);
  expect(hyphenated.every(key => key.includes('-'))).toBe(true);
});
