import { describe, expect, test } from 'vitest';
import { withCache } from '../withCache';
import { isCached } from './isCached';

describe('isCached', () => {
  test('no arguments', () => {
    const rnd = withCache(() => {
      return Math.random();
    });

    expect(isCached(rnd)).toBe(false);

    rnd();
    rnd();
    rnd();

    expect(isCached(rnd)).toBe(true);
  });

  test('with arguments', () => {
    const rnd = withCache((_: number) => {
      return Math.random();
    });

    expect(isCached(rnd, 1)).toBe(false);
    expect(isCached(rnd, 2)).toBe(false);
    expect(isCached(rnd, 3)).toBe(false);

    rnd(1);
    rnd(2);
    rnd(3);

    expect(isCached(rnd, 1)).toBe(true);
    expect(isCached(rnd, 2)).toBe(true);
    expect(isCached(rnd, 3)).toBe(true);
    expect(isCached(rnd, 4)).toBe(false);
  });
});
