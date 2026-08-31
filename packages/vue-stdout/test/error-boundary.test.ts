import { h } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createStdout } from './helpers/create-stdout';
import { createApp } from '../src/createApp';
import type { StdoutApp } from '../src/createApp';
import { ErrorBoundary } from '../src/components/ErrorBoundary';

const box = (props: any, ...kids: any[]) => h('stdout-box', props, kids);
const span = (props: any, ...kids: any[]) => h('stdout-text', props, kids);

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

describe('ErrorBoundary', () => {
  it('catches a descendant that throws during render instead of crashing the app', async () => {
    const stdout = createStdout(60);
    const onError = vi.fn();

    const Thrower = {
      render() {
        throw new Error('boom');
      },
    };

    let app!: StdoutApp;

    expect(() => {
      app = createApp({
        render: () => h(ErrorBoundary, { onError }, () => h(Thrower)),
      });
      app.mount({ stdout });
    }).not.toThrow();

    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
    const [caught] = onError.mock.calls[0]!;
    expect(caught).toBeInstanceOf(Error);
    expect((caught as Error).message).toBe('boom');

    expect(stdout.get()).toContain('ERROR');
    expect(stdout.get()).toContain('boom');

    app.unmount();
  });

  it('renders its children normally when nothing throws', async () => {
    const stdout = createStdout(60);

    const app = createApp({
      render: () =>
        h(ErrorBoundary, {}, () => box({}, span({}, 'all good'))),
    });
    app.mount({ stdout });

    await flush();

    expect(stdout.get()).toContain('all good');
    expect(stdout.get()).not.toContain('ERROR');

    app.unmount();
  });
});
