import { delay } from '@/promise/delay';
import { describe, expect, it, vi } from 'vitest';
import { debounce } from './debounce';

describe('debounce', () => {
  it('should debounce function calls', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc();
    debouncedFunc();
    debouncedFunc();

    await delay(debounceMs * 2);

    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should delay the function call by the specified wait time', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc();
    await delay(debounceMs / 2);
    expect(func).not.toHaveBeenCalled();

    await delay(debounceMs / 2 + 1);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should reset the wait time if called again before wait time ends', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc();
    await delay(debounceMs / 2);
    debouncedFunc();
    await delay(debounceMs / 2);
    debouncedFunc();
    await delay(debounceMs / 2);
    debouncedFunc();

    expect(func).not.toHaveBeenCalled();

    await delay(debounceMs + 1);
    expect(func).toHaveBeenCalledTimes(1);
  });

  it('should cancel the debounced function call', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc();
    debouncedFunc.cancel();
    await delay(debounceMs);

    expect(func).not.toHaveBeenCalled();
  });

  it('should work correctly if the debounced function is called after the wait time', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc();
    await delay(debounceMs + 1);
    debouncedFunc();
    await delay(debounceMs + 1);

    expect(func).toHaveBeenCalledTimes(2);
  });

  it('should have no effect if we call cancel when the function is not executed', () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    expect(() => debouncedFunc.cancel()).not.toThrow();
  });

  it('should call the function with correct arguments', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs);

    debouncedFunc('test', 123);

    await delay(debounceMs * 2);

    expect(func).toHaveBeenCalledTimes(1);
    expect(func).toHaveBeenCalledWith('test', 123);
  });

  it('should cancel the debounced function call if aborted via AbortSignal', async () => {
    const func = vi.fn();
    const debounceMs = 50;
    const controller = new AbortController();
    const signal = controller.signal;
    const debouncedFunc = debounce(func, debounceMs, { signal });

    debouncedFunc();
    controller.abort();

    await delay(debounceMs);

    expect(func).not.toHaveBeenCalled();
  });

  it('should not call the debounced function if it is already aborted by AbortSignal', async () => {
    const controller = new AbortController();
    const signal = controller.signal;

    controller.abort();

    const func = vi.fn();

    const debounceMs = 50;
    const debouncedFunc = debounce(func, debounceMs, { signal });

    debouncedFunc();

    await delay(debounceMs);

    expect(func).not.toHaveBeenCalled();
  });

  it('should not add multiple abort event listeners', async () => {
    const func = vi.fn();
    const debounceMs = 100;
    const controller = new AbortController();
    const signal = controller.signal;
    const addEventListenerSpy = vi.spyOn(signal, 'addEventListener');

    const debouncedFunc = debounce(func, debounceMs, { signal });

    debouncedFunc();
    debouncedFunc();

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(func).toHaveBeenCalledTimes(1);

    const listenerCount = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'abort',
    ).length;
    expect(listenerCount).toBe(1);

    addEventListenerSpy.mockRestore();
  });

  it('should keep a call made from inside func', async () => {
    const calls: number[] = [];
    const debounced = debounce((value: number) => {
      calls.push(value);
      if (value === 1) debounced(2);
    }, 20);

    debounced(1);
    await delay(60);
    await delay(60);

    expect(calls).toEqual([1, 2]);
  });

  it('should not repeat arguments after func throws', () => {
    const calls: number[] = [];
    const debounced = debounce((value: number) => {
      calls.push(value);
      throw new Error('boom');
    }, 20);

    debounced(1);
    expect(() => debounced.flush()).toThrow('boom');
    debounced.flush();
    debounced.cancel();

    expect(calls).toEqual([1]);
  });

  it('should drop pending arguments at the end of a leading-only window', async () => {
    const calls: number[] = [];
    const debounced = debounce((value: number) => calls.push(value), 20, {
      edges: ['leading'],
    });

    debounced(1);
    debounced(2);
    await delay(60);
    debounced.flush();

    expect(calls).toEqual([1]);
  });

  it('should not keep an abort listener after the timer ends', async () => {
    const controller = new AbortController();
    const { signal } = controller;
    let listeners = 0;
    const add = signal.addEventListener.bind(signal);
    const remove = signal.removeEventListener.bind(signal);

    signal.addEventListener = ((...args: any[]) => {
      listeners++;
      return (add as any)(...args);
    }) as any;
    signal.removeEventListener = ((...args: any[]) => {
      listeners--;
      return (remove as any)(...args);
    }) as any;

    const calls: number[] = [];
    const debounced = debounce((v: number) => calls.push(v), 20, { signal });

    expect(listeners).toBe(0);

    debounced(1);
    debounced(2);
    expect(listeners).toBe(1);

    await delay(60);
    expect(calls).toEqual([2]);
    expect(listeners).toBe(0);

    debounced(3);
    debounced.cancel();
    expect(listeners).toBe(0);

    debounced(4);
    controller.abort();
    await delay(60);
    expect(calls).toEqual([2]);
  });
});
