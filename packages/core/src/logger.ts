import { assert } from './assert';
import { isString } from './is';
import { sprintf } from './str/sprintf';
import type { Logger } from './types';

type LogLevel = Exclude<keyof Logger, 'extend'>;

const LEVEL_NUM: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
};

let currentLogLevel: number = LEVEL_NUM.log;

/**
 * Set global log level.
 * @group Utility Functions
 */
export const loggerSetLevel = (level: LogLevel) => {
  assert.number(LEVEL_NUM[level], `Invalid log level: ${level}`);
  currentLogLevel = LEVEL_NUM[level];
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
    const levelNum = LEVEL_NUM[level];

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
