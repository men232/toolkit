import { describe, expect, it } from 'vitest';
import { INLINE_ELEMENT_TAGS } from '../tree/layout';
import { INTRINSIC_TAGS, isCustomElement } from './compiler-options';

describe('isCustomElement', () => {
  it('claims the renderer tags Vue does not know', () => {
    expect(isCustomElement('stdout-box')).toBe(true);
    expect(isCustomElement('stdout-text')).toBe(true);
  });

  // Replaces an assertion that `span`/`b`/`a` were claimed. Those tags are
  // gone, and their absence is the point of the change: claiming a real HTML
  // tag as a custom element is what forced this package to publish its host
  // tags in the first place. Asserted negatively so a re-added HTML tag fails
  // here rather than in a consumer's unrelated `<span>`.
  it('never claims a real HTML tag', () => {
    expect(isCustomElement('span')).toBe(false);
    expect(isCustomElement('b')).toBe(false);
    expect(isCustomElement('a')).toBe(false);
  });

  it('does not claim unrelated tags', () => {
    expect(isCustomElement('div')).toBe(false);
    expect(isCustomElement('Box')).toBe(false);
  });

  it('exposes the tag set', () => {
    expect(INTRINSIC_TAGS.has('stdout-box')).toBe(true);
  });
});

describe('INTRINSIC_TAGS / layout INLINE_ELEMENT_TAGS sync', () => {
  // Asserts against the engine's real exported set, not a hand-mirrored copy,
  // so the claim in `compiler-options.ts`'s docstring is genuinely enforced.
  it('every inline element tag is claimed by INTRINSIC_TAGS', () => {
    for (const tag of INLINE_ELEMENT_TAGS) {
      expect(INTRINSIC_TAGS.has(tag)).toBe(true);
    }
  });
});
