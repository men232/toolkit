import { assert } from './assert';
import { createEnvParser } from './env/createEnvParser';
import { getEnvTarget } from './env/getEnvTarget';
import { isString, noop } from './is';
import { sprintf } from './str/sprintf';
import type { Logger } from './types';

export type LogLevel = Exclude<keyof Logger, 'extend'>;

/**
 * Log levels and their severity. A message is written when its level is at
 * least as severe as the current one, see {@link setLoggerLevel}.
 *
 * @example
 * if (LOG_LEVELS[getLoggerLevel()] <= LOG_LEVELS.debug) {
 *   // expensive debug-only diagnostics
 * }
 *
 * @group Utility Functions
 */
export const LOG_LEVELS = Object.freeze({
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
} as const) satisfies Readonly<Record<LogLevel, number>>;

const LOG_LEVEL_NAMES = Object.keys(LOG_LEVELS) as readonly LogLevel[];

let currentLogLevel: number =
  LOG_LEVELS[
    createEnvParser(getEnvTarget()).oneOf('LOG_LEVEL', LOG_LEVEL_NAMES, 'info')
  ];

/**
 * Set global log level.
 * @group Utility Functions
 */
export const setLoggerLevel = (level: LogLevel) => {
  assert.number(LOG_LEVELS[level], `Invalid log level: ${level}`);
  currentLogLevel = LOG_LEVELS[level];
};

/**
 * Get global log level.
 * @group Utility Functions
 */
export const getLoggerLevel = (): LogLevel => {
  return LOG_LEVEL_NAMES.find(name => LOG_LEVELS[name] === currentLogLevel)!;
};

/**
 * Create pretty simple `console.log` wrapper interface.
 *
 * @example
 * const log = logger('UserService');
 *
 * log.info('Create user: %s', 'user_1'); // Create user: %s
 *
 * @group Utility Functions
 */
export const logger = (...baseArgs: any[]): Logger => {
  // handle meta.url
  if (isString(baseArgs[0]?.url)) {
    baseArgs[0] = baseArgs[0]?.url;
  }

  // normalize meta.url
  if (typeof baseArgs[0] === 'string' && baseArgs[0][0] !== '[') {
    baseArgs[0] = `[${baseArgs[0].split('/')!.at(-1)!.split('?', 1)[0]!}]`;
  }

  const writeLog = (level: LogLevel, ...[pattern, ...args]: any[]) => {
    const levelNum = LOG_LEVELS[level];

    if (levelNum < currentLogLevel) {
      return;
    }

    if (!isString(pattern)) {
      // eslint-disable-next-line no-console
      console[level](...baseArgs, pattern, ...args);
      return;
    }

    const unusedArgs: any[] = [];
    const formatted = sprintf(pattern, args, unusedArgs);

    // eslint-disable-next-line no-console
    console[level](...baseArgs, formatted, ...unusedArgs);
  };

  const log = writeLog.bind(null, 'log');

  const info = writeLog.bind(null, 'info');

  const warn = writeLog.bind(null, 'warn');

  const error = writeLog.bind(null, 'error');

  const debug = writeLog.bind(null, 'debug');

  const extend = (...args: any[]) => {
    return logger(...baseArgs, ...args);
  };

  const instance = {
    log,
    info,
    warn,
    error,
    debug,
    extend,
  };

  return instance;
};

/**
 * Logger that does nothing
 */
export const noopLogger: Logger = {
  debug: noop,
  error: noop,
  extend: () => noopLogger,
  info: noop,
  log: noop,
  warn: noop,
};
