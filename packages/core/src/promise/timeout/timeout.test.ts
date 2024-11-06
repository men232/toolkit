import { catchError } from '@/catchError';
import { describe, expect, it } from 'vitest';
import { timeout } from './timeout';

describe('timeout', () => {
  it('throws error when time left', async () => {
    const timeoutError = new Error();

    const [err] = await catchError(() =>
      timeout(5, () => new Promise(() => {}), timeoutError),
    );

    expect(err).toBe(timeoutError);
  });

  it('single aborted when time left', async () => {
    let signal: AbortSignal | undefined;

    const [err] = await catchError(() =>
      timeout(5, _signal => {
        signal = _signal;
        return new Promise(() => {});
      }),
    );

    expect(signal?.aborted).toBe(true);
  });

  it('resolves correct value', async () => {
    const valueToResolve = Symbol();

    const [err, value] = await catchError(() =>
      timeout(10, () => {
        return new Promise(resolve =>
          setTimeout(() => resolve(valueToResolve), 5),
        );
      }),
    );

    expect(value).toBe(valueToResolve);
  });

  it('accepts callback return a promise', async () => {
    const valueToResolve = Symbol();

    const [err, value] = await catchError(() =>
      timeout(10, Promise.resolve(valueToResolve)),
    );

    expect(value).toBe(valueToResolve);
  });

  it('accepts callback return not a promise', async () => {
    const valueToResolve = Symbol();
    const [_, value] = await catchError(() =>
      timeout(10, () => valueToResolve),
    );

    expect(value).toBe(valueToResolve);
  });

  it('throws error when not callback or promise passed', async () => {
    const [err] = await catchError(() => timeout(10, {} as any));

    expect(err?.message).includes('Expected promise or callback');
  });
});
