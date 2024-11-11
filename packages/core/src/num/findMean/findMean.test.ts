import { describe, expect, it } from 'vitest';
import { findMean } from './findMean';

describe('findMean', () => {
  it('with initial', () => {
    const p = findMean(0);

    expect(p.count).toBe(1);
    expect(p.value).toBe(0);
  });

  it('no initial', () => {
    const p = findMean();

    expect(p.count).toBe(0);
    expect(p.value).toBe(0);
  });

  it('with initial .push()', () => {
    const p = findMean(3).push(3, 3);

    expect(p.count).toBe(3);
    expect(p.value).toBe(3);
  });

  it('no initial .push()', () => {
    const p = findMean().push(3).push(3).push(3);

    expect(p.count).toBe(3);
    expect(p.value).toBe(3);
  });
});
