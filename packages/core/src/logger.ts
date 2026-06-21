import { assert } from './assert';
import { env } from './env';
import { isString } from './is';
import { sprintf } from './str/sprintf';
import type { Logger } from './types';

export type LogLevel = Exclude<keyof Logger, 'extend'>;

const LEVEL_NAME_TO_NUM: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const LEVEL_NUM_TO_NAME: Record<number, LogLevel> = {
  0: 'debug',
  1: 'log',
  2: 'info',
  3: 'warn',
  4: 'error',
};

const LOG_LEVEL = env.string('LOG_LEVEL', 'info');

let currentLogLevel: number =
  LOG_LEVEL in LEVEL_NAME_TO_NUM
    ? LEVEL_NAME_TO_NUM[LOG_LEVEL as LogLevel]
    : LEVEL_NAME_TO_NUM.log;

/**
 * Set global log level.
 * @group Utility Functions
 */
export const setLoggerLevel = (level: LogLevel) => {
  assert.number(LEVEL_NAME_TO_NUM[level], `Invalid log level: ${level}`);
  currentLogLevel = LEVEL_NAME_TO_NUM[level];
};

/**
 * Set global log level.
 * @group Utility Functions
 */
export const getLoggerLevel = (): LogLevel => {
  return LEVEL_NUM_TO_NAME[currentLogLevel];
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
    const levelNum = LEVEL_NAME_TO_NUM[level];

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
