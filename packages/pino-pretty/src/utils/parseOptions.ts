import {
  type Arrayable,
  arrayable,
  capitalize,
  crc32,
  deepDefaults,
  withCache,
} from '@andrew_l/toolkit';
import { StringWidth } from '@cto.af/string-width';
import type { PinoPretty } from '..';
import type { ColorizeFn, PrettyOptions, PrettyOptionsParsed } from '../types';
import { type ColorName, RAND_COLOR_LIST, getColor } from './getColor';

export function parseOptions(value: PinoPretty.Options): PrettyOptionsParsed {
  const defOptions: PrettyOptions = {
    columns: 80,
    indent: 2,
    depth: 5,
    messageKey: 'msg',
    quoteStyle: 'single',
    badgeMinLevel: 40,
    maxStringLength: 400,
    numericSeparator: false,
    ignore: 'hostname,pid',
    colorize: true,
    types: {
      number: { color: 'green' },
      boolean: { color: 'redBright' },
      string: { color: 'yellow' },
      object: { color: 'gray' },
      error: { color: 'gray' },
      errorStack: { color: 'cyan' },
      time: { color: 'gray' },
      name: { color: 'rand' },
    },
    levels: {
      10: { badge: 'TRACE', color: 'gray', icon: '→' },
      20: { badge: 'DEBUG', color: 'blue', icon: '⚙' },
      30: { badge: 'INFO', color: 'cyan', icon: 'ℹ' },
      40: { badge: 'WARN', color: 'yellow', icon: '⚠' },
      50: { badge: 'ERROR', color: 'red', icon: '✖' },
      60: { badge: 'FATAL', color: 'red', icon: '✖' },
    },
  };

  const opts: PrettyOptions = deepDefaults({}, value, defOptions);

  const sw = new StringWidth({
    extraWidths: new Map(
      Object.values(opts.levels).map(v => [v.icon.charCodeAt(0), 1]),
    ),
  });

  const result: PrettyOptionsParsed = {
    ...opts,
    sw,
    colorFallback: createColorizeFn(opts.colorize, 'gray'),
    inspect: {
      depth: opts.depth,
      quoteStyle: opts.quoteStyle,
      indent: opts.indent,
      maxStringLength: opts.maxStringLength,
      numericSeparator: opts.numericSeparator,
      customStringify: {},
    },
    levels: Object.fromEntries(
      Object.entries(opts.levels).map(([key, value]) => [
        key,
        {
          ...value,
          color: createColorizeFn(opts.colorize, value.color),
          colorBadge: createColorizeBadgeFn(opts.colorize, value.color),
        },
      ]),
    ),
    types: Object.fromEntries(
      Object.entries(opts.types).map(([key, value]) => [
        key,
        {
          ...value,
          color: createColorizeFn(opts.colorize, value.color),
        },
      ]),
    ),
    ignoreAdditional: new Set([
      'level',
      'time',
      'pid',
      'hostname',
      opts.messageKey,
      opts.nestedKey ?? '',
      'name',
    ]),
    ignore: new Set(
      opts.ignore
        .split(',')
        .map(v => v.trim())
        .filter(Boolean),
    ),
  };

  result.inspect.customStringify = {
    number: result.types.number.color,
    boolean: result.types.boolean.color,
    string: result.types.string.color,
  };

  return result;
}

const randColor = withCache((str: string): ColorName => {
  var hash = crc32(str) >>> 0;
  var index = hash % RAND_COLOR_LIST.length;
  return RAND_COLOR_LIST[index];
});

function createColorizeFn(
  colorize: boolean,
  value: 'rand' | Arrayable<ColorName>,
): ColorizeFn {
  if (!colorize) {
    return String;
  }

  if (value === 'rand') {
    return v => getColor(randColor(v))(v);
  }

  var colors = arrayable(value) as ColorName[];

  if (!colors.length) return String;

  return v => {
    var result = v;

    for (var color of colors) {
      result = getColor(color)(result);
    }

    return result;
  };
}

function createColorizeBadgeFn(
  colorize: boolean,
  value: 'rand' | Arrayable<ColorName>,
): ColorizeFn {
  if (!colorize) {
    return String;
  }

  if (value === 'rand') {
    return v => getColor(randColor(v))(v);
  }

  var colors = arrayable(value).map(v => {
    if (v.startsWith('bg')) {
      v = v.slice(2);
    }

    return `bg${capitalize(v)}`;
  }) as ColorName[];

  if (!colors.length) return String;

  colors.push('black');

  return v => {
    var result = v;

    for (var color of colors) {
      result = getColor(color)(result);
    }

    return result;
  };
}
