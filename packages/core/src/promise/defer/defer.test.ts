import { describe, expect, it } from 'vitest';
import { defer } from './defer';

describe('defer', () => {
  it('resolve', async () => {
    const q = defer();

    setTimeout(q.resolve, 5);

    await q.promise;

    expect(true).toBe(true);
  });

  it('reject', async () => {
    const q = defer();
    const rejectValue = Symbol();

    setTimeout(() => q.reject(rejectValue), 5);

    const value = await q.promise.catch(v => v);

    expect(value).toBe(rejectValue);
  });
});
