import { getRandomInt } from '@/num';
import { describe, expect, it, vi } from 'vitest';
import { delay } from '../delay';
import { asyncFilterMap } from './asyncFilterMap';

describe('asyncFilterMap', () => {
  it('maps every value when nothing is skipped', async () => {
    const result = await asyncFilterMap([1, 2, 3], value => value * 2);

    expect(result).toEqual([2, 4, 6]);
  });

  it('excludes values for which the callback returns the skip sentinel', async () => {
    const result = await asyncFilterMap([1, 2, 3, 4], (value, skip) =>
      value % 2 === 0 ? value : skip,
    );

    expect(result).toEqual([2, 4]);
  });

  it('filters and maps at once, changing the value type', async () => {
    const result = await asyncFilterMap([1, 2, 3, 4, 5], (value, skip) =>
      value % 2 === 0 ? `even:${value}` : skip,
    );

    expect(result).toEqual(['even:2', 'even:4']);
  });

  it('resolves to an empty array for an empty input', async () => {
    const callback = vi.fn();

    expect(await asyncFilterMap([], callback)).toEqual([]);
    expect(callback).not.toHaveBeenCalled();
  });

  it('resolves to an empty array when every value is skipped', async () => {
    const result = await asyncFilterMap([1, 2, 3], (_value, skip) => skip);

    expect(result).toEqual([]);
  });

  it('supports async callbacks', async () => {
    const result = await asyncFilterMap([1, 2, 3, 4], (value, skip) =>
      Promise.resolve(value % 2 === 0 ? value : skip),
    );

    expect(result).toEqual([2, 4]);
  });

  it('keeps strict source order despite out-of-order concurrent completions', async () => {
    const arr = Array.from({ length: 50 }, (_, i) => i);
    const predicate = (value: number) => value % 3 !== 0;

    const expected = arr.filter(predicate).map(value => value * 10);

    const result = await asyncFilterMap(
      arr,
      async (value, skip) => {
        // Random delay so items resolve out of dispatch order.
        await delay(getRandomInt(1, 4));
        return predicate(value) ? value * 10 : skip;
      },
      { concurrency: 8 },
    );

    // No gaps, and order matches the synchronous filter().map() baseline.
    expect(result).toEqual(expected);
    expect(result).toHaveLength(expected.length);
  });

  it('matches arr.filter().map() capability with concurrency', async () => {
    const arr = [15, 3, 8, 22, 1, 9, 40, 7, 2, 11];
    const predicate = (v: number, idx: number) => v > 5 && idx % 2 === 0;

    const expected = arr.filter(predicate).map(v => v + 1);

    const result = await asyncFilterMap(
      arr,
      async (value, skip, index) => {
        await delay(getRandomInt(1, 3));
        return predicate(value, index) ? value + 1 : skip;
      },
      { concurrency: 4 },
    );

    expect(result).toEqual(expected);
  });

  it('keeps falsy mapped values that are not the skip sentinel', async () => {
    const result = await asyncFilterMap([0, 1, 2, 3], (value, skip) =>
      value === 2 ? skip : value,
    );

    expect(result).toEqual([0, 1, 3]);
  });

  it('passes value, skip, index and the source array to the callback', async () => {
    const source = ['a', 'b', 'c'];
    const callback = vi.fn((value: string) => value);

    await asyncFilterMap(source, callback);

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

  it('rejects when the callback throws', async () => {
    await expect(
      asyncFilterMap([1, 2, 3], value => {
        if (value === 2) throw new Error('boom');
        return value;
      }),
    ).rejects.toThrow('boom');
  });

  it('rejects when an async callback rejects', async () => {
    await expect(
      asyncFilterMap([1, 2, 3], async value => {
        await delay(1);
        if (value === 2) throw new Error('async boom');
        return value;
      }),
    ).rejects.toThrow('async boom');
  });

  it('treats concurrency below 1 as a single worker', async () => {
    const result = await asyncFilterMap(
      [1, 2, 3, 4],
      (value, skip) => (value % 2 === 0 ? value : skip),
      { concurrency: 0 },
    );

    expect(result).toEqual([2, 4]);
  });

  it('does not block the event loop', async () => {
    const arr = Array.from({ length: 20 }, (_, i) => i);

    let mapCompleted = false;
    let ranWhileMapping = false;

    await Promise.all([
      asyncFilterMap(arr, value => value).then(() => {
        mapCompleted = true;
      }),
      Promise.resolve().then(() => {
        if (!mapCompleted) ranWhileMapping = true;
      }),
    ]);

    expect(ranWhileMapping).toBe(true);
  });
});
