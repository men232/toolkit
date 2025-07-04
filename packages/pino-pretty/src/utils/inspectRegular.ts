/**
 * Source code: https://github.dev/inspect-js/object-inspect/blob/main/index.js
 * Simplified because we working here with json serialized object
 */
import { isFunction, isObject } from '@andrew_l/toolkit';

import { inspect as nodeInspect } from 'node:util';
import type { InspectOptions } from '../types';

export var QUOTES = { double: '"', single: "'" } as const;
var QUOTE_REGEX = { double: /(["\\])/g, single: /(['\\])/g } as const;
var ESCAPE_CHARS = { 8: 'b', 9: 't', 10: 'n', 12: 'f', 13: 'r' } as const;
var SEP_REGEX = /\d(?=(?:\d{3})+(?!\d))/g;

function addNumericSeparator(num: number | bigint, str: string): string {
  // Skip formatting for small numbers, infinity, NaN, or scientific notation
  if (
    num === Infinity ||
    num === -Infinity ||
    Number.isNaN(num) ||
    (typeof num === 'number' && Math.abs(num) < 1000) ||
    str.includes('e')
  ) {
    return str;
  }

  if (typeof num === 'number' && !Number.isInteger(num)) {
    var intPart = Math.trunc(num);
    var intStr = String(intPart);
    var decPart = str.slice(intStr.length + 1);

    return (
      intStr.replace(SEP_REGEX, '$&_') +
      '.' +
      decPart.replace(/(\d{3})/g, '$&_').replace(/_$/, '')
    );
  }

  return str.replace(SEP_REGEX, '$&_');
}

export function escapeString(str: string, opts: InspectOptions): string {
  var quoteRegex = QUOTE_REGEX[opts.quoteStyle];

  return str.replace(quoteRegex, '\\$1').replace(/[\x00-\x1f]/g, char => {
    var code = char.charCodeAt(0);
    var escapeChar = ESCAPE_CHARS[code as keyof typeof ESCAPE_CHARS];
    return escapeChar
      ? `\\${escapeChar}`
      : `\\x${code.toString(16).padStart(2, '0').toUpperCase()}`;
  });
}

function inspectString(str: string, opts: InspectOptions): string {
  // Truncate if too long
  if (str.length > opts.maxStringLength) {
    var remaining = str.length - opts.maxStringLength;
    var trailer = `... ${remaining} more character${remaining > 1 ? 's' : ''}`;
    str = str.slice(0, opts.maxStringLength);
    return inspectString(str, opts) + trailer;
  }

  // Escape quotes and control characters
  var escaped = escapeString(str, opts);

  var quote = QUOTES[opts.quoteStyle];
  var result = `${quote}${escaped}${quote}`;

  return opts.customStringify.string?.(result) ?? result;
}

export function inspectNumber(
  num: number | bigint,
  opts: InspectOptions,
): string {
  if (typeof num === 'bigint') {
    var str = `${num}n`;
    var result = opts.numericSeparator ? addNumericSeparator(num, str) : str;
    return opts.customStringify.number?.(result) ?? result;
  }

  var str = Object.is(num, -0) ? '-0' : String(num);
  var result = opts.numericSeparator ? addNumericSeparator(num, str) : str;
  return opts.customStringify.number?.(result) ?? result;
}

function getIndentStrings(opts: InspectOptions, depth: number) {
  if (depth === 0) return { base: ' '.repeat(opts.indent), prev: '' };

  return {
    base: ' '.repeat(opts.indent),
    prev: ' '.repeat(opts.indent * depth),
  };
}

function isSingleLine(values: string[]): boolean {
  return values.every(value => !value.includes('\n'));
}

function formatMultiline(
  values: string[],
  indent: { base: string; prev: string },
): string {
  if (values.length === 0) return '';

  var lineJoiner = `\n${indent.prev}${indent.base}`;
  return `${lineJoiner}${values.join(`,${lineJoiner}`)}\n${indent.prev}`;
}

function getObjectEntries(
  obj: any,
  inspectFn: (value: any, parent: any) => string,
): string[] {
  var isArray = Array.isArray(obj);
  var entries: string[] = [];

  // Handle array indices
  if (isArray) {
    for (var i = 0; i < obj.length; i++) {
      entries[i] = Object.hasOwn(obj, i) ? inspectFn(obj[i], obj) : '';
    }
  }

  // Handle object properties
  for (var key in obj) {
    if (!Object.hasOwn(obj, key)) continue;

    // Skip array indices we already handled
    if (isArray && /^\d+$/.test(key) && Number(key) < obj.length) continue;

    var needsQuotes = /[^\w$]/.test(key);
    var keyStr = needsQuotes ? inspectFn(key, obj) : key;
    entries.push(`${keyStr}: ${inspectFn(obj[key], obj)}`);
  }

  return entries;
}

function inspectValue(
  obj: any,
  opts: InspectOptions,
  depth: number,
  seen: WeakSet<any>,
): string {
  // Handle primitives
  if (obj === undefined)
    return opts.customStringify.undefined?.(obj) ?? 'undefined';
  if (obj === null) return opts.customStringify.null?.(obj) ?? 'null';
  if (typeof obj === 'boolean')
    return opts.customStringify.boolean?.(obj) ?? String(obj);
  if (typeof obj === 'string') return inspectString(obj, opts);

  // Handle numbers
  if (typeof obj === 'number') {
    return inspectNumber(obj, opts);
  } else if (typeof obj === 'bigint') {
    return inspectNumber(obj, opts);
  }

  // Check depth limit
  if (depth >= opts.depth && opts.depth > 0 && typeof obj === 'object') {
    return Array.isArray(obj) ? '[Array]' : '[Object]';
  }

  // Check for circular references
  if (seen.has(obj)) return '[Circular]';
  seen.add(obj);

  var indent = getIndentStrings(opts, depth);

  var inspectChild = (value: any) => inspectValue(value, opts, depth + 1, seen);

  // Handle arrays
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';

    var entries = getObjectEntries(obj, inspectChild);

    if (indent.base && !isSingleLine(entries)) {
      return `[${formatMultiline(entries, indent)}]`;
    }
    return `[ ${entries.join(', ')} ]`;
  }

  // Handle objects
  if (isObject(obj)) {
    // Check for custom inspect method
    if (isFunction((obj as any)[nodeInspect.custom])) {
      var lineJoiner = `\n${indent.prev}`;
      return nodeInspect(obj, { depth: opts.depth - depth })
        .split('\n')
        .join(lineJoiner);
    }

    var entries = getObjectEntries(obj, inspectChild);
    if (entries.length === 0) return '{}';

    if (indent.base) {
      return `{${formatMultiline(entries, indent)}}`;
    }
    return `{ ${entries.join(', ')} }`;
  }

  seen.delete(obj);
  return String(obj);
}

export function inspectRegular(obj: any, options: InspectOptions): string {
  return inspectValue(obj, options, 0, new WeakSet());
}
