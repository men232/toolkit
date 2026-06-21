import { EJSON, type Logger, isFunction, typeOf } from '@andrew_l/toolkit';
import type { AppDefinition } from '../app.ts';
import { createLogger, noopLogger } from '../logger.ts';

export type LogEventFields = Record<string, any>;

export function formatLogEvent(event: string, fields?: LogEventFields): string {
  if (!fields) return event;
  const parts: string[] = [];
  for (const key in fields) {
    if (key === 'vrun_app_thread_message') continue;
    const v = fields[key];
    if (v === undefined) continue;
    parts.push(`${key}=${formatField(v)}`);
  }
  return parts.length ? `${event} ${parts.join(' ')}` : event;
}

function formatField(value: unknown): string {
  switch (typeOf(value)) {
    case 'array':
    case 'object':
      return EJSON.stringify(value);

    default: {
      return String(value);
    }
  }
}

export function createAppLogger(definition: AppDefinition): Logger {
  return definition.logger === false
    ? noopLogger
    : isFunction(definition.logger)
      ? definition.logger(definition)
      : definition.logger || createLogger(definition.name);
}
