import { type Logger, noop } from '@andrew_l/toolkit';
import { type ConsolaInstance, LogLevels, createConsola } from 'consola';

export const log = createConsola({
  formatOptions: { date: false },
  level: LogLevels.info,
  fancy: true,
}) as ConsolaInstance & Logger;

export const noopLogger: Logger = {
  debug: noop,
  error: noop,
  extend: noop,
  info: noop,
  log: noop,
  warn: noop,
};
