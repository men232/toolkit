/**
 * Based on https://github.com/unjs/consola/blob/main/src/reporters/fancy.ts
 */

import { has, isString, omit } from '@andrew_l/toolkit';
import type { SerializedError } from 'pino';

import path from 'node:path';
import { formatWithOptions, inspect as nodeInspect } from 'node:util';

import type { LogObject, PrettyOptionsParsed } from './types.js';
import { getColor, inspect } from './utils/index.js';

function isSerializedError(value: any): value is SerializedError {
  return has(value, ['type', 'message', 'stack']);
}

function parseStack(stack: string, message: string) {
  const cwd = process.cwd() + path.sep;

  const lines = stack
    .split('\n')
    .splice(message.split('\n').length)
    .map(l => l.trim().replace('file://', '').replace(cwd, ''));

  return lines;
}

function characterFormat(str: string) {
  return (
    str
      // highlight backticks
      .replace(/`([^`]+)`/gm, (_, m) => getColor('cyan')(m))
      // underline underscores
      .replace(/\s+_([^_]+)_\s+/gm, (_, m) => ` ${getColor('underline')(m)} `)
  );
}

function formatStack(
  stack: string,
  message: string,
  errorLevel: number,
  opts: PrettyOptionsParsed,
) {
  const indent = ' '.repeat(opts.indent * errorLevel);
  const colorizeStack = opts.types.errorStack?.color || opts.colorFallback;

  return (
    `\n${indent}` +
    parseStack(stack, message)
      .map(
        line =>
          '  ' + line.replace(/\((.+)\)/, (_, m) => `(${colorizeStack(m)})`),
      )
      .join(`\n${indent}`)
  );
}

function formatDate(date: Date, opts: PrettyOptionsParsed) {
  return opts.ignore.has('time') ? '' : date.toLocaleTimeString();
}

function formatType(
  logObj: LogObject,
  badge: boolean,
  opts: PrettyOptionsParsed,
) {
  const levelBadge = opts.levels[logObj.level].badge || `LEVEL:${logObj.level}`;

  if (badge) {
    const colorize =
      opts.levels[logObj.level]?.colorBadge || opts.colorFallback;

    return colorize(` ${levelBadge} `);
  }

  const type = opts.levels[logObj.level].icon || levelBadge;
  const typeColor = opts.levels[logObj.level].color || opts.colorFallback;

  return type ? typeColor(type) : '';
}

function filterAndJoin(arr: any[]): string {
  return arr.filter(Boolean).join(' ');
}

function formatError(
  err: any,
  errorLevel: number,
  opts: PrettyOptionsParsed,
): string {
  const message =
    (err.type ? `${err.type}: ` : '') +
    (err.message ??
      formatWithOptions({ depth: opts.depth, colors: opts.colorize }, err));

  const colorizeError = opts.types.error?.color || opts.colorFallback;
  const stack = err.stack
    ? formatStack(err.stack, message, errorLevel, opts)
    : '';

  const causedPrefix =
    errorLevel > 0 ? `${' '.repeat(opts.indent * errorLevel)}[cause]: ` : '';

  const causedError = err.cause
    ? '\n\n' + formatError(err.cause, errorLevel + 1, opts)
    : '';

  return colorizeError(causedPrefix + message + stack + causedError);
}

function formatAdditional(
  obj: Record<string, any>,
  opts: PrettyOptionsParsed,
): string {
  const additional: any = {};
  let empty = true;

  if (isSerializedError(obj)) {
    return formatError(obj, 0, opts);
  } else {
    for (const key in obj) {
      empty = false;

      if (isSerializedError(obj[key])) {
        additional[key] = {
          ...obj[key],
          [nodeInspect.custom]: () => formatError(obj[key], 0, opts),
        };
      } else {
        additional[key] = obj[key];
      }
    }
  }

  if (empty) {
    return '';
  }

  const colorizeObject = opts.types.object?.color || opts.colorFallback;

  return colorizeObject(inspect(additional, opts.inspect).slice(2, -2));
}

export function pretty(this: PrettyOptionsParsed, logObj: LogObject) {
  const opts = this;
  const message = isString(logObj[opts.messageKey])
    ? logObj[opts.messageKey]
    : '';

  const additional = opts.nestedKey
    ? formatAdditional(logObj[opts.nestedKey], opts)
    : formatAdditional(omit(logObj, opts.ignoreAdditional), opts);

  const date = formatDate(new Date(logObj.time), opts);
  const coloredDate = date ? opts.types.time.color(date) : '';

  const isBadge = logObj.level >= opts.badgeMinLevel;
  const type = formatType(logObj, isBadge, opts);

  const name = logObj.name ? opts.types.name.color(logObj.name as string) : '';

  let line;
  const left = filterAndJoin([type, characterFormat(message)]);
  const right = filterAndJoin([name, coloredDate]);
  const space = opts.columns - opts.sw.width(left) - opts.sw.width(right) - 2;

  line =
    space > 0 && opts.columns >= 80
      ? left + ' '.repeat(space) + right
      : (right ? `[${right}] ` : '') + left;

  if (additional) {
    line += '\n' + additional;
  }

  return isBadge ? '\n' + line + '\n' : line;
}
