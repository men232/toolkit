import { env } from './env';
import { isString, noop } from './is';
import { sprintf } from './str/sprintf';
import type { Logger } from './types';

const IS_DEV = env.isDevelopment || env.bool('DEV', false);

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
  // normalize meta.url
  if (typeof baseArgs[0] === 'string' && baseArgs[0][0] !== '[') {
    baseArgs[0] = `[${baseArgs[0].split('/')!.at(-1)!.split('?', 1)[0]!}]`;
  }

  const writeLog = (level: keyof Logger, ...[pattern, ...args]: any[]) => {
    if (!isString(pattern)) {
      // @ts-expect-error
      // eslint-disable-next-line no-console
      console[level](...baseArgs, pattern, ...args);
      return;
    }

    const unusedArgs: any[] = [];
    const formatted = sprintf(pattern, args, unusedArgs);

    // @ts-expect-error
    // eslint-disable-next-line no-console
    console[level](...baseArgs, ...formatted, ...unusedArgs);
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

  Object.defineProperty(instance, 'debug', {
    get: () => (IS_DEV ? debug : noop),
  });

  return instance;
};
