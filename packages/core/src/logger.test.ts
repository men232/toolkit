import { afterEach, expect, expectTypeOf, test, vi } from 'vitest';
import {
  LOG_LEVELS,
  type LogLevel,
  getLoggerLevel,
  logger,
  setLoggerLevel,
} from './logger';

const initialLevel = getLoggerLevel();

afterEach(() => {
  setLoggerLevel(initialLevel);
  vi.restoreAllMocks();
});

test('LOG_LEVELS (ordered by severity, frozen, literal types)', () => {
  expect(Object.keys(LOG_LEVELS)).toStrictEqual([
    'debug',
    'log',
    'info',
    'warn',
    'error',
  ]);
  expect(LOG_LEVELS.debug).toBeLessThan(LOG_LEVELS.error);
  expect(Object.isFrozen(LOG_LEVELS)).toBe(true);

  expectTypeOf(LOG_LEVELS.warn).toEqualTypeOf<3>();
  expectTypeOf<keyof typeof LOG_LEVELS>().toEqualTypeOf<LogLevel>();
});

test('setLoggerLevel / getLoggerLevel (round trip)', () => {
  for (const level of Object.keys(LOG_LEVELS) as LogLevel[]) {
    setLoggerLevel(level);
    expect(getLoggerLevel()).toBe(level);
  }
});

test('setLoggerLevel (rejects unknown level)', () => {
  expect(() => setLoggerLevel('verbose' as LogLevel)).toThrow(
    'Invalid log level: verbose',
  );
});

test('logger (writes at or above the current level only)', () => {
  const info = vi.spyOn(console, 'info').mockImplementation(() => {});
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const log = logger('test');

  setLoggerLevel('warn');
  log.info('hidden');
  log.warn('shown %s', 'x');

  expect(info).not.toHaveBeenCalled();
  expect(warn).toHaveBeenCalledExactlyOnceWith('[test]', 'shown x');
});
