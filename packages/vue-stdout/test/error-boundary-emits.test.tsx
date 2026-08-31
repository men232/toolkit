import { defineComponent } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/createApp';
import { ErrorBoundary } from '../src/components/ErrorBoundary';
import { createStdout } from './helpers/create-stdout';
import ErrorBoundarySfc from './fixtures/ErrorBoundarySfc.vue';
import { caughtErrors } from './fixtures/error-recorder';

const flush = () => new Promise<void>(resolve => process.nextTick(resolve));

const Thrower = defineComponent({
  name: 'Thrower',
  render() {
    throw new Error('jsx-boom');
  },
});

/**
 * `<ErrorBoundary>` reports the caught error as the `error` emit. Both call
 * styles have to keep working: JSX writes `onError={fn}` (Vue routes `onXxx`
 * props to emit listeners), templates write `@error="fn"`.
 */
describe('ErrorBoundary error reporting', () => {
  it('reports through onError={} from JSX', async () => {
    const stdout = createStdout(60);
    const onError = vi.fn();

    const app = createApp({
      render: () => (
        <ErrorBoundary onError={onError}>
          <Thrower />
        </ErrorBoundary>
      ),
    });
    app.mount({ stdout });

    await flush();

    expect(onError).toHaveBeenCalledTimes(1);
    expect((onError.mock.calls[0]![0] as Error).message).toBe('jsx-boom');

    app.unmount();
  });

  it('reports through @error and @error.once from an SFC template', async () => {
    const stdout = createStdout(60);
    caughtErrors.length = 0;

    const app = createApp(ErrorBoundarySfc);
    app.mount({ stdout });

    await flush();

    // Plain `@error` compiles to an `onError` prop, so it reached a
    // hand-read callback prop too. `@error.once` compiles to `onErrorOnce`,
    // which only `emit()` resolves -- that listener fired not at all until
    // `emits: ['error']` was declared.
    expect(caughtErrors.map(error => error.message).sort()).toEqual([
      'sfc-boom',
      'sfc-boom-once',
    ]);

    app.unmount();
  });

  it('declares `error` as an emit rather than a callback prop', () => {
    expect((ErrorBoundary as any).emits).toEqual(['error']);
    expect((ErrorBoundary as any).props).toEqual([]);
  });
});
