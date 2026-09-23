import { expect, test, vi } from 'vitest';

/**
 * `logger` reads LOG_LEVEL through the env core and `env` reports through
 * `logger`. Whichever module is imported first, both must initialize.
 */

test('env imported before logger', async () => {
  vi.resetModules();

  const { env } = await import('./index');
  const { logger } = await import('../logger');

  expect(typeof env.string).toBe('function');
  expect(typeof logger('test').warn).toBe('function');
});

test('logger imported before env', async () => {
  vi.resetModules();

  const { logger } = await import('../logger');
  const { env } = await import('./index');

  expect(typeof logger('test').warn).toBe('function');
  expect(typeof env.string).toBe('function');
});
