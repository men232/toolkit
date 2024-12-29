import { describe, expect, it } from 'vitest';
import { withCacheBucketBatch } from './withCacheBucketBatch';

describe('withCacheBucketBatch', () => {
  it('should cache objects', async () => {
    const records: Record<string, { id: string; name: string; gen: number }> = {
      '1': { id: '1', name: 'John', gen: 0 },
      '2': { id: '2', name: 'John', gen: 0 },
      '3': { id: '3', name: 'John', gen: 0 },
      '4': { id: '4', name: 'John', gen: 0 },
      '5': { id: '5', name: 'John', gen: 0 },
      '6': { id: '6', name: 'John', gen: 0 },
      '7': { id: '7', name: 'John', gen: 0 },
      '8': { id: '8', name: 'John', gen: 0 },
      '9': { id: '9', name: 'John', gen: 0 },
      '10': { id: '10', name: 'John', gen: 0 },
      '11': { id: '11', name: 'John', gen: 0 },
      '12': { id: '12', name: 'John', gen: 0 },
      '13': { id: '13', name: 'John', gen: 0 },
      '14': { id: '14', name: 'John', gen: 0 },
    };

    const fn = withCacheBucketBatch(
      {
        key: 'id',
        sizeMs: 1000,
        capacity: 10,
        batchSize: 2,
      },
      async (values: string[]) => {
        return values
          .map(v => records[v])
          .filter(Boolean)
          .map(v => ({
            ...v,
            gen: v.gen + 1,
          }));
      },
    );

    await fn(['1', '2', '3']);

    const result = await fn(['1', '2', '3']);

    expect(Array.from(result.values()).map(v => v.gen)).toEqual([1, 1, 1]);
  });
});
