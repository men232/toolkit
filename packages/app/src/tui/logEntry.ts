import type { LogLevel } from '@andrew_l/toolkit';
import type { LogEntry } from './types.ts';

export const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'gray',
  log: 'white',
  info: 'cyan',
  warn: 'yellow',
  error: 'red',
};

export function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number): string => n.toString().padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function formatLevel(level: LogLevel): string {
  return level.toUpperCase().padEnd(5);
}

/**
 * The `HH:MM:SS LEVEL ` a rendered entry carries before its text.
 *
 * Exists so `useLogFeed` can measure a row at the width it will actually be
 * laid out at: the prefix is part of the same wrapped line as the message, so
 * budgeting the message alone would under-count every entry.
 */
export function formatEntryPrefix(entry: LogEntry): string {
  return `${formatTime(entry.ts)} ${formatLevel(entry.level)} `;
}
