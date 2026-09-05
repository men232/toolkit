import type { LogLevel } from '@andrew_l/toolkit';
import type { LogEntry } from './types.ts';

export type LevelFilter = 'all' | 'info' | 'warn' | 'error';

const LEVEL_RANK: Record<LogLevel, number> = {
  debug: 0,
  log: 1,
  info: 2,
  warn: 3,
  error: 4,
};

const FILTER_THRESHOLD: Record<LevelFilter, number> = {
  all: 0,
  info: LEVEL_RANK.info,
  warn: LEVEL_RANK.warn,
  error: LEVEL_RANK.error,
};

export function passesFilter(entry: LogEntry, filter: LevelFilter): boolean {
  return LEVEL_RANK[entry.level] >= FILTER_THRESHOLD[filter];
}

/** The `f` key cycles through the levels in this order. */
export function nextFilter(filter: LevelFilter): LevelFilter {
  switch (filter) {
    case 'all':
      return 'info';
    case 'info':
      return 'warn';
    case 'warn':
      return 'error';
    case 'error':
      return 'all';
  }
}
