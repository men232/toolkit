import { isSkip, isSuccess } from '@andrew_l/toolkit';
import { describe, expect, it, vi } from 'vitest';
import {
  type AppDefinition,
  createAppInstance,
  defineApp,
  runApp,
  setupApp,
  shutdownApp,
  stopApp,
} from './app.js';
import { createAppHub } from './appHub.js';
import type { PropOptions } from './utils/props.ts';

vi.mock('./logger.js', () => ({
  log: { start: vi.fn(), success: vi.fn() },
}));

async function setupHub(hub: AppDefinition) {
  const instance = createAppInstance(hub);
  await setupApp(instance, {});
  return instance;
}

async function runHub(hub: AppDefinition) {
  const instance = createAppInstance(hub);
  await setupApp(instance, {});
  await runApp(instance);
  return instance;
}

describe('createAppHub', () => {
  it('returns an AppDefinition named app-hub', () => {
    const hub = createAppHub([defineApp({ name: 'foo' })]);
    expect(hub.name).toBe('app-hub');
  });

  it('description includes all child app names', () => {
    const hub = createAppHub([
      defineApp({ name: 'alpha' }),
      defineApp({ name: 'beta' }),
    ]);
    expect(hub.description).toContain('alpha');
    expect(hub.description).toContain('beta');
  });

  it('merges child props with camelCase-prefixed names', () => {
    const propPort: PropOptions = { type: Number };
    const propUrl: PropOptions = { type: String };

    const hub = createAppHub([
      defineApp({ name: 'my-app', props: { port: propPort } }),
      defineApp({ name: 'db', props: { url: propUrl } }),
    ]);
    expect((hub.props as any).myAppPort).toBe(propPort);
    expect((hub.props as any).dbUrl).toBe(propUrl);
  });
});

describe('appHub setup', () => {
  it('sets up all child apps and returns success', async () => {
    const setups = [
      vi.fn().mockResolvedValue({}),
      vi.fn().mockResolvedValue({}),
    ];
    const hub = createAppHub([
      defineApp({ name: 'a', setup: setups[0] }),
      defineApp({ name: 'b', setup: setups[1] }),
    ]);
    const result = await setupApp(createAppInstance(hub), {});
    expect(isSuccess(result)).toBe(true);
    setups.forEach(s => expect(s).toHaveBeenCalled());
  });

  it('passes prefixed props down to the correct child', async () => {
    const setup = vi.fn().mockResolvedValue({});
    const hub = createAppHub([
      defineApp({ name: 'db', props: { url: {} as any }, setup }),
    ]);
    await setupApp(createAppInstance(hub), { dbUrl: 'postgres://localhost' });
    expect(setup).toHaveBeenCalledWith({ url: 'postgres://localhost' });
  });

  it('skips with a readable error when a child setup fails', async () => {
    const hub = createAppHub([
      defineApp({
        name: 'bad',
        setup: vi.fn().mockRejectedValue(new Error('boom')),
      }),
    ]);
    const result = await setupApp(createAppInstance(hub), {});
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(
      /Failed to setup 1 app\(s\):/,
    );
    expect((result.error as Error).message).toContain('bad');
    expect((result.error as Error).message).toContain('setup_app');
  });
});

describe('appHub entry', () => {
  it('runs all child apps and returns success', async () => {
    const entries = [
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(undefined),
    ];
    const hub = createAppHub([
      defineApp({ name: 'a', entry: entries[0] }),
      defineApp({ name: 'b', entry: entries[1] }),
    ]);
    const instance = await setupHub(hub);
    const result = await runApp(instance);
    expect(isSuccess(result)).toBe(true);
    entries.forEach(e => expect(e).toHaveBeenCalled());
  });

  it('skips with a readable error when a child entry fails', async () => {
    const hub = createAppHub([
      defineApp({
        name: 'broken',
        entry: vi.fn().mockRejectedValue(new Error('entry fail')),
      }),
    ]);
    const instance = await setupHub(hub);
    const result = await runApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(
      /Failed to start 1 app\(s\):/,
    );
    expect((result.error as Error).message).toContain('broken');
  });
});

describe('appHub stop', () => {
  it('stops all child apps and returns success', async () => {
    const stops = [
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(undefined),
    ];
    const hub = createAppHub([
      defineApp({ name: 'a', stop: stops[0] }),
      defineApp({ name: 'b', stop: stops[1] }),
    ]);
    const instance = await runHub(hub);
    const result = await stopApp(instance);
    expect(isSuccess(result)).toBe(true);
    stops.forEach(s => expect(s).toHaveBeenCalled());
  });

  it('skips with a readable error when a child stop fails', async () => {
    const hub = createAppHub([
      defineApp({
        name: 'stubborn',
        stop: vi.fn().mockRejectedValue(new Error('no stop')),
      }),
    ]);
    const instance = await runHub(hub);
    const result = await stopApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(
      /Failed to stop 1 app\(s\):/,
    );
    expect((result.error as Error).message).toContain('stubborn');
  });
});

describe('appHub shutdown', () => {
  it('shuts down all child apps and returns success', async () => {
    const shutdowns = [
      vi.fn().mockResolvedValue(undefined),
      vi.fn().mockResolvedValue(undefined),
    ];
    const hub = createAppHub([
      defineApp({ name: 'a', shutdown: shutdowns[0] }),
      defineApp({ name: 'b', shutdown: shutdowns[1] }),
    ]);
    const instance = await setupHub(hub);
    const result = await shutdownApp(instance);
    expect(isSuccess(result)).toBe(true);
    shutdowns.forEach(s => expect(s).toHaveBeenCalled());
  });

  it('skips with a readable error when a child shutdown fails', async () => {
    const hub = createAppHub([
      defineApp({
        name: 'immortal',
        shutdown: vi.fn().mockRejectedValue(new Error('no die')),
      }),
    ]);
    const instance = await setupHub(hub);
    const result = await shutdownApp(instance);
    expect(isSkip(result)).toBe(true);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(
      /Failed to shutdown 1 app\(s\):/,
    );
    expect((result.error as Error).message).toContain('immortal');
  });
});
