import { type Logger, getLoggerLevel, noop } from '@andrew_l/toolkit';
import { type ConsolaInstance, LogLevels, createConsola } from 'consola';

export const createLogger = (tagName?: string): ConsolaInstance & Logger => {
  const log = createConsola({
    formatOptions: { date: false },
    level: LogLevels[getLoggerLevel()],
    fancy: true,
    defaults: {
      tag: tagName,
    },
  }) as ConsolaInstance & Logger;

  log.extend = (tagName: any) => createLogger(tagName) as Logger;

  return log;
};

export const log: ConsolaInstance & Logger = createLogger();

export const noopLogger: Logger = {
  debug: noop,
  error: noop,
  extend: () => noopLogger,
  info: noop,
  log: noop,
  warn: noop,
};
