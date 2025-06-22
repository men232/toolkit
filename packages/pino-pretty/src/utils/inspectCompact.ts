/**
 * Simplified yaml-like inspect implementation
 */
import { isFunction, isPrimitive, typeOf } from '@andrew_l/toolkit';
import { inspect as nodeInspect } from 'node:util';
import type { InspectOptions } from '../types';
import { QUOTES, escapeString, inspectNumber } from './inspectRegular.js';

type InspectTypeFunction = (
  obj: any,
  opts: InspectOptions,
  depth: number,
  spaces: string,
  seen: WeakSet<any>,
) => string;

var INSPECT_MAP: Record<string, InspectTypeFunction> = {
  boolean: (obj, opts) => opts.customStringify.boolean?.(obj) ?? String(obj),
  string: inspectString,
  number: inspectNumber,
  bigint: inspectNumber,
  undefined: (obj, opts) =>
    opts.customStringify.undefined?.(obj) ?? 'undefined',
  null: () => 'null',
  array: formatArray,
  object: formatObject,
};

export function inspectCompact(obj: any, options: InspectOptions): string {
  return inspectValue(obj, options, 0, new WeakSet());
}

function inspectValue(
  obj: any,
  opts: InspectOptions,
  depth: number = 0,
  seen: WeakSet<any>,
): string {
  var spaces = depth > 0 ? ' '.repeat(opts.indent * depth) : '';
  var type = typeOf(obj);
  var inspectFn: InspectTypeFunction = INSPECT_MAP[type] || String;

  // Check for custom inspect method
  if (obj && isFunction((obj as any)[nodeInspect.custom])) {
    var lineJoiner = `\n${spaces}`;
    return (
      spaces +
      nodeInspect(obj, { depth: opts.depth - depth })
        .split('\n')
        .join(lineJoiner)
    );
  }

  return inspectFn(obj, opts, depth, spaces, seen);
}

function inspectString(str: string, opts: InspectOptions): string {
  // Truncate if too long
  if (str.length > opts.maxStringLength) {
    var remaining = str.length - opts.maxStringLength;
    str = str.slice(0, opts.maxStringLength);
    return formatString(str, remaining, opts);
  }

  return formatString(str, 0, opts);
}

function formatString(
  str: string,
  remaining: number,
  opts: InspectOptions,
): string {
  var escaped = escapeString(str, opts);
  var quote = QUOTES[opts.quoteStyle];
  var result: string;

  var trailer =
    remaining > 0
      ? opts.customStringify.stringRemaining(`... ${remaining} more characters`)
      : '';

  if (escaped.length > opts.columns && escaped.includes('\\n')) {
    escaped = escaped.replaceAll('\\n', '\n');
    result =
      '\n```\n' + (trailer ? `${escaped}\n${trailer}` : escaped) + '\n```';
  } else {
    result = `${quote}${escaped}${trailer ?? ''}${quote}`;
  }

  return opts.customStringify.string?.(result) ?? result;
}

// Optimized array formatting
function formatArray(
  arr: any[],
  opts: InspectOptions,
  depth: number,
  spaces: string,
  seen: WeakSet<any>,
): string {
  if (opts.depth > 0 && depth >= opts.depth) {
    return '[Array]';
  }

  if (seen.has(arr)) {
    return '[Circular]';
  }

  seen.add(arr);

  // Check if all elements are simple (avoid forEach overhead)
  var len = arr.length;

  if (isCompactFormat(arr, depth, spaces.length, opts)) {
    // Create fresh array for compact format
    var compact: string[] = [];

    for (var i = 0; i < len; i++) {
      compact.push(inspectValue(arr[i], opts, 0, seen));
    }

    return `[${compact.join(', ')}]`;
  }

  // Multi-line format
  var multiline: string[] = [];

  for (var i = 0; i < len; i++) {
    var strValue = inspectValue(arr[i], opts, depth + 1, seen);
    multiline.push(
      `${spaces}- ${strValue.trimStart ? strValue.trimStart() : strValue}`,
    );
  }

  return multiline.join('\n');
}

function isCompactFormat(
  value: any[],
  depth: number,
  spaces: number,
  opts: InspectOptions,
): boolean {
  var availableLength = opts.columns - spaces - depth * opts.indent;
  var totalLength = 0;

  if (availableLength <= 0) return false;

  for (var item of value.flat()) {
    totalLength += String(item).length + 2;
    if (totalLength > availableLength || !isPrimitive(item)) return false;
  }

  return true;
}

// Optimized object formatting
function formatObject(
  obj: any,
  opts: InspectOptions,
  depth: number,
  spaces: string,
  seen: WeakSet<any>,
): string {
  if (opts.depth > 0 && depth >= opts.depth) {
    return '[Array]';
  }

  if (seen.has(obj)) {
    return '[Circular]';
  }

  seen.add(obj);

  var entries = Object.entries(obj);
  var len = entries.length;

  if (len === 0) return '{}';

  if (isCompactFormat(entries, depth, spaces.length, opts)) {
    var compact: string[] = [];
    var key, value;

    for (var i = 0; i < len; i++) {
      key = entries[i][0];
      value = entries[i][1];
      compact.push(`${key}: ${inspectValue(value, opts, 0, seen)}`);
    }

    return `{ ${compact.join(', ')} }`;
  }

  // Multi-line format
  var multiline: string[] = [];
  var key, value, strValue, compactMode;

  for (var i = 0; i < len; i++) {
    key = entries[i][0];
    value = entries[i][1];
    strValue = inspectValue(value, opts, depth + 1, seen);

    // Optimized format decision
    compactMode = strValue[0] === '{' || strValue[0] === '[';

    if (compactMode) {
      multiline.push(`${spaces}${key}: ${strValue}`);
    } else if (value && typeof value === 'object') {
      if (Array.isArray(value) && value.length > 0 && strValue[0] !== '[') {
        multiline.push(`${spaces}${key}:\n${strValue}`);
      } else if (!Array.isArray(value)) {
        multiline.push(`${spaces}${key}:\n${strValue}`);
      } else {
        multiline.push(`${spaces}${key}: ${strValue}`);
      }
    } else {
      multiline.push(`${spaces}${key}: ${strValue}`);
    }
  }

  return multiline.join('\n');
}
