import { type ShallowRef, h } from 'vue';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/createApp';
import { Box, Text } from '../src/components';
import { useDOMElement } from '../src/hooks/useDOMElement';
import { renderToString } from '../src/renderToString';
import { type DOMElement, type DOMNode, DOMNodeType } from '../src/tree';
import { createStdout } from './helpers/create-stdout';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

const describeNode = (node: DOMNode): string =>
  node.nodeType === DOMNodeType.TEXT_NODE
    ? `#text(${JSON.stringify(node.textContent)})`
    : node.nodeName === 'DOMComment'
      ? '#comment'
      : ((node as DOMElement).tagName ?? node.nodeName);

const shape = (node: DOMNode): unknown =>
  node.childNodes.length === 0
    ? describeNode(node)
    : [describeNode(node), node.childNodes.map(shape)];

const count = (node: DOMNode): number =>
  1 + node.childNodes.reduce((total, child) => total + count(child), 0);

/**
 * `<Box>` and `<Text>` hand their slot's children to `h()` directly rather than
 * wrapping them in a one-element array.
 *
 * The difference is invisible in the output and expensive in the tree. A nested
 * array is not a vnode, so Vue's `normalizeVNode` turns it into a **Fragment**,
 * and a Fragment mounts with an anchor node on each side — two extra host
 * `DOMText` children per component, for a tree with roughly twice as many nodes
 * as it has elements. Measured on the real `createApp().mount()` path: 3 204
 * host nodes for an 801-element tree against 1 602, and a synchronous mount 7 %
 * to 34 % slower depending on shape.
 *
 * Every one of those nodes is a `DOMNode` (an `EventEmitter` subclass) that has
 * to be allocated, linked, walked by `setRootDocument`, skipped by
 * `paintChildren` and counted by `yogaChildIndexOf`, for a value that is always
 * the empty string.
 *
 * These pin the shape, because nothing else can: the rendered frame is
 * byte-identical either way, so the whole rest of the suite stays green if the
 * wrapping array comes back.
 */
describe('the host tree a component tree builds', () => {
  it('gives a <Box> exactly its slot children, with nothing around them', async () => {
    const stdout = createStdout(40);
    let node!: ShallowRef<DOMElement | null>;

    const app = createApp({
      setup() {
        node = useDOMElement();

        return () =>
          h(Box as any, { flexDirection: 'column' }, () => [
            h(Text as any, null, () => 'a'),
            h(Text as any, null, () => 'b'),
          ]);
      },
    });
    app.mount({ stdout, maxFps: 0 });
    await flush();

    expect(shape(node.value!)).toEqual([
      'stdout-box',
      [
        ['stdout-text', ['#text("a")']],
        ['stdout-text', ['#text("b")']],
      ],
    ]);

    // Three elements and two text nodes -- one host node per thing that exists.
    expect(count(node.value!)).toBe(5);

    app.unmount();
  });

  it('does not grow the tree as a component tree deepens', async () => {
    const stdout = createStdout(40);
    let node!: ShallowRef<DOMElement | null>;

    const DEPTH = 10;

    const app = createApp({
      setup() {
        node = useDOMElement();

        return () => {
          let tree: any = h(Text as any, null, () => 'leaf');
          for (let level = 0; level < DEPTH; level++) {
            const inner = tree;
            tree = h(Box as any, { flexDirection: 'column' }, () => inner);
          }
          return tree;
        };
      },
    });
    app.mount({ stdout, maxFps: 0 });
    await flush();

    // DEPTH boxes + one <Text> + its text node. Wrapped children would make it
    // 3 * (DEPTH + 1) + 1.
    expect(count(node.value!)).toBe(DEPTH + 2);

    app.unmount();
  });

  it('renders the same frame either way', () => {
    // The companion to the two above: whatever the tree looks like, this is
    // what must not move.
    const frame = renderToString(
      {
        render: () =>
          h(Box as any, { flexDirection: 'column', borderStyle: 'round' }, () => [
            h(Text as any, { bold: true }, () => 'alpha'),
            h(Text as any, { color: 'green' }, () => 'beta'),
          ]),
      },
      { columns: 20 },
    );

    expect(frame.split('\n')).toHaveLength(4);
    expect(frame).toContain('alpha');
    expect(frame).toContain('beta');
  });
});
