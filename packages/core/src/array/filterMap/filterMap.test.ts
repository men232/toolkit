import { describe, expect, it, vi } from 'vitest';
import { filterMap } from './filterMap';

describe('filterMap', () => {
  it('maps every value when nothing is skipped', () => {
    expect(filterMap([1, 2, 3], value => value * 2)).toEqual([2, 4, 6]);
  });

  it('excludes values for which the callback returns the skip sentinel', () => {
    const result = filterMap([1, 2, 3, 4], (value, skip) =>
      value % 2 === 0 ? value : skip,
    );

    expect(result).toEqual([2, 4]);
  });

  it('filters and maps in a single pass, changing the value type', () => {
    const result = filterMap([1, 2, 3, 4, 5], (value, skip) =>
      value % 2 === 0 ? `even:${value}` : skip,
    );

    expect(result).toEqual(['even:2', 'even:4']);
  });

  it('returns an empty array when every value is skipped', () => {
    expect(filterMap([1, 2, 3], (_value, skip) => skip)).toEqual([]);
  });

  it('returns an empty array for an empty input', () => {
    const callback = vi.fn();

    expect(filterMap([], callback)).toEqual([]);
    expect(callback).not.toHaveBeenCalled();
  });

  it('passes value, skip, index and the source array to the callback', () => {
    const source = ['a', 'b', 'c'];
    const callback = vi.fn((value: string) => value);

    filterMap(source, callback);

    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenNthCalledWith(
      1,
      'a',
      expect.any(Symbol),
      0,
      source,
    );
    expect(callback).toHaveBeenNthCalledWith(
      2,
      'b',
      expect.any(Symbol),
      1,
      source,
    );
    expect(callback).toHaveBeenNthCalledWith(
      3,
      'c',
      expect.any(Symbol),
      2,
      source,
    );
  });

  it('keeps falsy values that are not the skip sentinel', () => {
    const result = filterMap([0, 1, null, false, ''], value => value);

    expect(result).toEqual([0, 1, null, false, '']);
  });

  it('does not mutate the source array', () => {
    const source = [1, 2, 3];

    filterMap(source, (value, skip) => (value === 2 ? skip : value));

    expect(source).toEqual([1, 2, 3]);
  });
});
