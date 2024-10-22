import { env } from './env';
import { isString, noop } from './is';
import type { Logger } from './types';

const IS_DEV = env.bool('DEV', false);

const REGEX_PLACEHOLDER = /\%[s,d,O,o,j]/g;

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

    const formatted: any[] = [];
    let matchIndex = 0;
    let idx = 0;

    for (const match of pattern.matchAll(REGEX_PLACEHOLDER)) {
      const placeholder = match[0];

      let value = args[matchIndex];
      let shouldUseSplit = false;

      switch (placeholder) {
        case '%s':
          break;

        case '%d': {
          shouldUseSplit = true;
          break;
        }

        case '%O':
        case '%o': {
          shouldUseSplit = true;
          break;
        }

        case '%j': {
          value = JSON.stringify(value);
          break;
        }
      }

      const str = pattern.slice(idx, match.index);

      if (shouldUseSplit) {
        formatted.push(str, value);
      } else if (isString(formatted.at(-1))) {
        formatted[formatted.length - 1] += str + value;
      } else {
        formatted.push(str + value);
      }

      idx = match.index + placeholder.length;
      matchIndex++;
    }

    if (matchIndex < args.length - 1) {
      formatted.push(args.slice(matchIndex, args.length));
    }

    // @ts-expect-error
    // eslint-disable-next-line no-console
    console[level](...baseArgs, ...formatted);
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
