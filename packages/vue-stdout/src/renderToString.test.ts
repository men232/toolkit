import { h } from 'vue';
import { describe, expect, it } from 'vitest';
import { renderToString } from './renderToString';

// Children of intrinsic elements must be arrays, not slot functions —
// a slot function on a plain element renders as empty.
const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

describe('renderToString', () => {
  it('renders plain text', () => {
    expect(renderToString({ render: () => box({}, span({}, 'hello')) })).toBe(
      'hello',
    );
  });

  it('renders a border at the requested width', () => {
    const output = renderToString(
      { render: () => box({ borderStyle: 'round' }, span({}, 'hi')) },
      { columns: 10 },
    );

    expect(output).toBe('╭────────╮\n│hi      │\n╰────────╯');
  });

  it('defaults to 80 columns', () => {
    const output = renderToString({
      render: () => box({ borderStyle: 'round' }, span({}, 'x')),
    });

    expect(output.split('\n')[0]).toHaveLength(80);
  });

  it('survives repeated render/destroy cycles with sibling nodes', () => {
    // Each render tears down a box with multiple sibling children, which
    // exercises NodeTree#destroy()'s child-array traversal (a `forEach`
    // over an array being spliced mid-iteration by `remove()` would skip
    // every other sibling and leak its yoga node). Three-plus siblings per
    // level ensure that skip pattern would trigger if it regressed.
    for (let i = 0; i < 200; i++) {
      expect(
        renderToString({
          render: () =>
            box(
              {},
              span({}, `n${i}a`),
              span({}, `n${i}b`),
              span({}, `n${i}c`),
            ),
        }),
      ).toBe(`n${i}an${i}bn${i}c`);
    }
  });
});
