import { describe, expect, it } from 'vitest';
import { DOM, type DOMNode } from './DOMTree';
import { renderToFrame } from './render';
import { squashTextNodes } from './squashText';

const el = (
  tag: string,
  attrs: Record<string, any> = {},
  kids: DOMNode[] = [],
) => {
  const node = DOM.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const kid of kids) node.appendChild(kid);
  return node;
};

const t = (s: string) => DOM.createTextNode(s);

const ESC = String.fromCharCode(27);

describe('squashTextNodes', () => {
  it('strips a dangerous escape sequence out of bare text', () => {
    expect(squashTextNodes(el('stdout-text', {}, [t(`before${ESC}[2Jafter`)]))).toBe(
      'beforeafter',
    );
  });

  it('strips a dangerous escape sequence contributed by a nested inline element, keeping its own SGR styling', () => {
    const squashed = squashTextNodes(
      el('stdout-text', {}, [
        t('a'),
        el('stdout-text', { color: 'green' }, [t(`x${ESC}[2Jy`)]),
      ]),
    );

    expect(squashed).toBe(`a${ESC}[32mxy${ESC}[39m`);
  });

  it('joins sibling text runs into one string', () => {
    expect(squashTextNodes(el('stdout-text', {}, [t('he'), t('llo')]))).toBe('hello');
  });

  it('ignores comment nodes', () => {
    const span = el('stdout-text', {}, [t('a')]);
    span.appendChild(DOM.createComment('v-if'));
    span.appendChild(t('b'));

    expect(squashTextNodes(span)).toBe('ab');
  });

  it("applies a nested inline element's own transform", () => {
    const squashed = squashTextNodes(
      el('stdout-text', {}, [t('a'), el('stdout-text', { color: 'green' }, [t('x')])]),
    );

    expect(squashed).toBe('a\u001B[32mx\u001B[39m');
  });

  it('leaves an empty nested element untransformed', () => {
    expect(squashTextNodes(el('stdout-text', {}, [el('stdout-text', { bold: true })]))).toBe(
      '',
    );
  });

  it('contributes nothing for a non-inline child', () => {
    expect(squashTextNodes(el('stdout-text', {}, [el('stdout-box', {}, [t('x')])]))).toBe('');
  });
});

describe('squashTextNodes: terminal safety', () => {
  it('never lets user text reach the frame with a screen-clear intact', () => {
    const frame = renderToFrame(
      el('stdout-box', {}, [el('stdout-text', {}, [t(`user input${ESC}[2J`)])]),
      20,
    );

    expect(frame).not.toContain(`${ESC}[2J`);
    expect(frame).toBe('user input');
  });

  it('never lets user text reach the frame with an alternate-screen switch intact', () => {
    const frame = renderToFrame(
      el('stdout-box', {}, [el('stdout-text', {}, [t(`x${ESC}[?1049hy`)])]),
      20,
    );

    expect(frame).not.toContain(`${ESC}[?1049h`);
    expect(frame).toBe('xy');
  });
});

describe('nested text rendering', () => {
  it('nested Text inherits outer style', () => {
    const frame = renderToFrame(
      el('stdout-box', {}, [
        el('stdout-text', { bold: true }, [el('stdout-text', { color: 'green' }, [t('x')])]),
      ]),
      20,
    );

    expect(frame).toBe('\u001B[1m\u001B[32mx\u001B[39m\u001B[22m');
  });

  it('gives a nested inline element no Yoga node of its own', () => {
    const inner = el('stdout-text', {}, [t('x')]);
    const outer = el('stdout-text', {}, [inner]);

    expect(outer.yogaNode).not.toBeNull();
    expect(inner.yogaNode).toBeNull();
  });

  it('restores a Yoga node when an inline element leaves an inline parent', () => {
    const inner = el('stdout-text', {}, [t('x')]);
    const outer = el('stdout-text', {}, [inner]);
    const box = el('stdout-box');

    expect(inner.yogaNode).toBeNull();

    box.appendChild(inner);

    expect(inner.yogaNode).not.toBeNull();
    expect(outer.childNodes).toHaveLength(0);
    expect(renderToFrame(box, 20)).toBe('x');
  });

  it('measures bare text alongside element children (mixed content)', () => {
    const frame = renderToFrame(
      el('stdout-box', {}, [el('stdout-text', {}, [t('a'), el('stdout-text', {}, [t('b')])])]),
      20,
    );

    expect(frame).toBe('ab');
  });

  it('breaks the line in place for a nested newline element', () => {
    const frame = renderToFrame(
      el('stdout-box', {}, [
        el('stdout-text', {}, [t('a'), el('stdout-text', {}, [t('\n')]), t('b')]),
      ]),
      20,
    );

    expect(frame).toBe('a\nb');
  });

  it('survives a nested element appended to an already-measured text root', () => {
    // The measure function installed by the first pass is what makes this
    // dangerous: Yoga hard-aborts (wasm trap, not an exception) on
    // `insertChild` into a node that carries one.
    const outer = el('stdout-text', {}, [t('a')]);
    const box = el('stdout-box', {}, [outer]);

    expect(renderToFrame(box, 20)).toBe('a');

    outer.appendChild(el('stdout-text', { bold: true }, [t('b')]));

    expect(renderToFrame(box, 20)).toBe('a\u001B[1mb\u001B[22m');
  });

  it('survives a box appended to an already-measured text root', () => {
    // Same trap, but here the child *does* bring a Yoga node, so the measure
    // function has to be cleared before it is inserted.
    const outer = el('stdout-text', {}, [t('a')]);
    const box = el('stdout-box', {}, [outer]);

    expect(renderToFrame(box, 20)).toBe('a');

    outer.appendChild(el('stdout-box', { width: 2, height: 1 }));

    expect(outer.yogaNode!.getChildCount()).toBe(1);
  });

  it("re-measures after a nested element's text changes", () => {
    const inner = el('stdout-text', {}, [t('x')]);
    const outer = el('stdout-text', {}, [inner]);
    const box = el('stdout-box', {}, [outer]);

    expect(renderToFrame(box, 20)).toBe('x');

    inner.textContent = 'wider';

    expect(renderToFrame(box, 20)).toBe('wider');
  });
});
