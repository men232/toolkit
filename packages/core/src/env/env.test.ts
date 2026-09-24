import { expect, expectTypeOf, test, vi } from 'vitest';
import { logger, noopLogger } from '../logger';
import { createEnvParser } from './createEnvParser';
import { getEnvTarget } from './getEnvTarget';

const ENV: Record<string, string> = {
  bool_true: 'true',
  bool_false: 'false',

  int_correct: '150',
  int_decimal: '150.99',

  decimal_correct: '3.3333',

  string_correct: 'sk_prod_key',

  list_bool_correct: 'true,false,true,false',
  list_bool_invalid: 'true,blabla,true,false',

  list_int_correct: '1,2,3,4',
  list_int_invalid: '1,abc,3,4',

  list_decimal_correct: '1.25,2.25,3.25,4.25',
  list_decimal_invalid: '1.25,abc,3.25,4.25',

  list_string_correct: 'word1,word2,word3, word4',
  list_empty: '',
  list_blank: '   ',
  list_commas: ' , , ',
};

/** Boolean */

test('env (boolean = true)', () => {
  const env = createEnvParser(ENV);

  expect(env.bool('bool_true')).toBe(true);
  expect(env.bool('bool_false')).toBe(false);
});

test('env (boolean = false)', () => {
  const env = createEnvParser(ENV);

  expect(env.bool('bool_false')).toBe(false);
});

test('env (boolean = undefined)', () => {
  const env = createEnvParser(ENV);

  expect(env.bool('bool_not_exists')).toBe(false);
});

test('env (boolean = default)', () => {
  const env = createEnvParser(ENV);

  expect(env.bool('bool_not_exists', true)).toBe(true);
});

/** Int */

test('env (int = correct)', () => {
  const env = createEnvParser(ENV);

  expect(env.int('int_correct')).toBe(150);
});

test('env (int = with decimal / default)', () => {
  const env = createEnvParser(ENV);

  expect(env.int('int_decimal', 7)).toBe(7);
});

test('env (int = strict)', () => {
  const env = createEnvParser({
    A: '42abc',
    B: '1e3',
    C: '1_000',
    D: '9007199254740993',
  });

  expect(env.int('A', 7)).toBe(7);
  expect(env.int('B', 7)).toBe(1000);
  expect(env.int('C', 7)).toBe(7);
  expect(env.int('D', 7)).toBe(7);
  expect(env.list('B', 'int')).toStrictEqual([1000]);
});

test('env (scalar = trimmed)', () => {
  const env = createEnvParser({
    BOOL: ' true ',
    INT: ' 42 ',
    LEVEL: ' info ',
    STR: ' x ',
  });

  expect(env.bool('BOOL')).toBe(true);
  expect(env.int('INT')).toBe(42);
  expect(env.oneOf('LEVEL', ['info'])).toBe('info');
  expect(env.string('STR')).toBe(' x ');
});

test('env (int = undefined)', () => {
  const env = createEnvParser(ENV);

  expect(env.int('int_not_exists')).toBe(0);
});

test('env (int = defaults)', () => {
  const env = createEnvParser(ENV);

  expect(env.int('int_not_exists', 1)).toBe(1);
});

/** Decimal */

test('env (decimal = correct)', () => {
  const env = createEnvParser(ENV);

  expect(env.decimal('decimal_correct')).toBe(3.3333);
});

test('env (decimal = rounded)', () => {
  const env = createEnvParser(ENV);

  expect(env.decimal('decimal_correct', 2)).toBe(3.33);
});

test('env (decimal = undefined)', () => {
  const env = createEnvParser(ENV);

  expect(env.decimal('decimal_not_exists')).toBe(0);
});

test('env (decimal = default)', () => {
  const env = createEnvParser(ENV);

  expect(env.decimal('decimal_not_exists', undefined, 5.33)).toBe(5.33);
});

test('env (decimal = default + rounded)', () => {
  const env = createEnvParser(ENV);

  expect(env.decimal('decimal_not_exists', 2, 5.3333)).toBe(5.33);
});

/** String */

test('env (string = correct)', () => {
  const env = createEnvParser(ENV);

  expect(env.string('string_correct')).toBe('sk_prod_key');
});

test('env (string = undefined)', () => {
  const env = createEnvParser(ENV);

  expect(env.string('string_not_exists')).toBe('');
});

test('env (string = default)', () => {
  const env = createEnvParser(ENV);

  expect(env.string('string_not_exists', 'api_key')).toBe('api_key');
});

/** List */
test('env (list = int)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_int_correct', 'int')).toStrictEqual([1, 2, 3, 4]);
});

test('env (list = int / invalid)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_int_invalid', 'int')).toStrictEqual([1, 3, 4]);
});

test('env (list = decimal)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_decimal_correct', 'decimal')).toStrictEqual([
    1.25, 2.25, 3.25, 4.25,
  ]);
});

test('env (list = decimal / invalid)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_decimal_invalid', 'decimal')).toStrictEqual([
    1.25, 3.25, 4.25,
  ]);
});

test('env (list = boolean)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_bool_correct', 'bool')).toStrictEqual([
    true,
    false,
    true,
    false,
  ]);
});

test('env (list = boolean / invalid)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_bool_invalid', 'bool')).toStrictEqual([
    true,
    true,
    false,
  ]);
});

test('env (list = string)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_string_correct', 'string')).toStrictEqual([
    'word1',
    'word2',
    'word3',
    'word4',
  ]);
});

test('env (list = empty value)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_empty', 'string')).toStrictEqual([]);
});

test('env (list = empty value overrides default)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_empty', 'string', ['ADMIN'])).toStrictEqual([]);
});

test('env (list = blank value overrides default)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_blank', 'string', ['ADMIN'])).toStrictEqual([]);
});

test('env (list = commas only overrides default)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_commas', 'string', ['ADMIN'])).toStrictEqual([]);
});

test('env (list = missing key / default)', () => {
  const env = createEnvParser(ENV);

  expect(env.list('list_missing', 'string', ['ADMIN'])).toStrictEqual([
    'ADMIN',
  ]);
});

/** NODE_ENV flags */

test('env (isStage)', () => {
  const env = createEnvParser({ NODE_ENV: 'stage' });

  expect(env.isStage).toBe(true);
  expect(env.isDevelopment).toBe(false);
  expect(env.isProduction).toBe(false);
  expect(env.isTest).toBe(false);
});

test('env (flags = Vite MODE)', () => {
  const env = createEnvParser({ MODE: 'stage' });

  expect(env.isStage).toBe(true);
  expect(env.isDevelopment).toBe(false);
  expect(createEnvParser({ NODE_ENV: '', MODE: 'stage' }).isStage).toBe(true);
  expect(createEnvParser({ NODE_ENV: ' test ' }).isTest).toBe(true);
});

test('env (flags = NODE_ENV over MODE)', () => {
  const env = createEnvParser({ NODE_ENV: 'production', MODE: 'stage' });

  expect(env.isProduction).toBe(true);
  expect(env.isStage).toBe(false);
});

/** Prototype keys are not environment values */

test('env (prototype keys = default)', () => {
  const env = createEnvParser(ENV);

  expect(env.string('constructor')).toBe('');
  expect(env.string('toString', 'x')).toBe('x');
  expect(env.bool('constructor', true)).toBe(true);
  expect(env.int('constructor', 7)).toBe(7);
  expect(env.decimal('constructor', 2, 1.5)).toBe(1.5);
  expect(env.list('constructor', 'string', ['ADMIN'])).toStrictEqual(['ADMIN']);
  expect(env.json('constructor')).toBe(null);
});

/** Warnings go through the given logger and must not leak raw values */

test('env (list = invalid item warning has no value)', () => {
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    createEnvParser(ENV, { logger: logger('env') }).list(
      'list_int_invalid',
      'int',
    );

    expect(consoleWarn).toHaveBeenCalledTimes(1);

    const message = consoleWarn.mock.calls[0].join(' ');

    expect(message).toContain('[env]');
    expect(message).toContain('list_int_invalid[1]');
    expect(message).not.toContain('abc');
  } finally {
    consoleWarn.mockRestore();
  }
});

test('env (custom logger)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { ...ENV, bad_json: '{oops' },
    { logger: { ...noopLogger, warn } },
  );

  env.list('list_int_invalid', 'int');
  env.json('bad_json');

  expect(warn).toHaveBeenCalledTimes(2);
  expect(warn).toHaveBeenNthCalledWith(
    1,
    'Failed to parse env list item as "%s": %s[%d]',
    'int',
    'list_int_invalid',
    1,
  );
  expect(warn).toHaveBeenNthCalledWith(
    2,
    'Failed to parse env variable as "%s": %s',
    'json',
    'bad_json',
  );
  expect(JSON.stringify(warn.mock.calls)).not.toContain('abc');
});

test('env (no logger = silent)', () => {
  const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

  try {
    expect(
      createEnvParser({ ...ENV, bad_json: '{oops' }).json('bad_json', 'x'),
    ).toBe('x');
    expect(createEnvParser(ENV).list('list_int_invalid', 'int')).toStrictEqual([
      1, 3, 4,
    ]);
    expect(consoleWarn).not.toHaveBeenCalled();
  } finally {
    consoleWarn.mockRestore();
  }
});

/** Non-finite decimals */

test('env (decimal = strict)', () => {
  const env = createEnvParser({ A: '1.5abc', B: '1.5e1' });

  expect(env.decimal('A', undefined, 7)).toBe(7);
  expect(env.decimal('B')).toBe(15);
  expect(env.list('A', 'decimal')).toStrictEqual([]);
});

test('env (json = default typed)', () => {
  const env = createEnvParser({});

  expectTypeOf(env.json<{ a: number }>('X')).toEqualTypeOf<{
    a: number;
  } | null>();
  expectTypeOf(env.json<{ a: number }>('X', null)).toEqualTypeOf<{
    a: number;
  } | null>();
  expectTypeOf(env.json<{ a: number }>('X', { a: 1 })).toEqualTypeOf<{
    a: number;
  }>();
  expectTypeOf(
    env.json<{ a: number } | null>('X', null as { a: number } | null),
  ).toEqualTypeOf<{ a: number } | null>();
  expectTypeOf(
    env.json<{ a: number }>('X', null as { a: number } | null),
  ).toEqualTypeOf<{ a: number } | null>();
  expect(env.json('X', { a: 1 })).toStrictEqual({ a: 1 });
});

test('env (decimal = Infinity)', () => {
  const env = createEnvParser({
    inf: 'Infinity',
    neg_inf: '-Infinity',
    overflow: '1e400',
  });

  expect(env.decimal('inf')).toBe(Infinity);
  expect(env.decimal('inf', 2)).toBe(Infinity);
  expect(env.decimal('neg_inf', 2)).toBe(-Infinity);
  expect(env.decimal('overflow', 2)).toBe(Infinity);
});

test('env (list = decimal / Infinity)', () => {
  const env = createEnvParser({ list: '1.255,Infinity,-Infinity' });

  expect(env.list('list', 'decimal')).toStrictEqual([
    1.255,
    Infinity,
    -Infinity,
  ]);
});

/** Non-string values (e.g. Vite `import.meta.env.DEV`) are read as text */

test('env (non-string values)', () => {
  const env = createEnvParser({
    PORT: 3000,
    RATIO: 0.5,
    DEV: true,
    SSR: false,
    NOTHING: null,
    OBJ: { a: 1 },
  } as unknown as Record<string, string>);

  expect(env.int('PORT')).toBe(3000);
  expect(env.string('PORT')).toBe('3000');
  expect(env.decimal('RATIO')).toBe(0.5);
  expect(env.bool('DEV')).toBe(true);
  expect(env.bool('SSR', true)).toBe(false);
  expect(env.string('DEV')).toBe('true');
  expect(env.list('PORT', 'int')).toStrictEqual([3000]);
  expect(env.json('PORT')).toBe(3000);

  expect(env.string('NOTHING', 'x')).toBe('x');
  expect(env.int('OBJ', 7)).toBe(7);
});

/** getEnvTarget */

test('getEnvTarget (node = process.env)', () => {
  expect(getEnvTarget()).toBe(process.env);
});

/** Invalid scalar values warn, missing or empty ones do not */

test('env (invalid scalar values warn)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { BOOL: 'yes', INT: 'abc', DEC: 'abc', EMPTY: '', BLANK: '   ' },
    { logger: { ...noopLogger, warn } },
  );

  expect(env.bool('BOOL', true)).toBe(true);
  expect(env.int('INT', 7)).toBe(7);
  expect(env.decimal('DEC', 2, 1.5)).toBe(1.5);

  expect(warn.mock.calls).toStrictEqual([
    ['Failed to parse env variable as "%s": %s', 'bool', 'BOOL'],
    ['Failed to parse env variable as "%s": %s', 'int', 'INT'],
    ['Failed to parse env variable as "%s": %s', 'decimal', 'DEC'],
  ]);

  warn.mockClear();

  expect(env.int('EMPTY', 7)).toBe(7);
  expect(env.bool('EMPTY', true)).toBe(true);
  expect(env.int('BLANK', 7)).toBe(7);
  expect(env.parse('EMPTY', Number, 3000)).toBe(3000);
  expect(env.int('MISSING', 7)).toBe(7);
  expect(warn).not.toHaveBeenCalled();
});

const LEVELS = ['debug', 'info', 'warn'] as const;

test('env (oneOf = correct)', () => {
  const env = createEnvParser({ LEVEL: 'warn' });
  const level = env.oneOf('LEVEL', LEVELS, 'info');

  expect(level).toBe('warn');
  expectTypeOf(level).toEqualTypeOf<'debug' | 'info' | 'warn'>();
});

test('env (oneOf = invalid / default + warn)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { LEVEL: 'verbose' },
    { logger: { ...noopLogger, warn } },
  );

  expect(env.oneOf('LEVEL', LEVELS, 'info')).toBe('info');
  expect(warn).toHaveBeenCalledWith(
    'Failed to parse env variable as "%s": %s',
    'oneOf',
    'LEVEL',
  );
});

test('env (oneOf = missing)', () => {
  const env = createEnvParser({});

  expect(env.oneOf('LEVEL', LEVELS, 'info')).toBe('info');
  expect(env.oneOf('LEVEL', LEVELS)).toBeUndefined();
  expectTypeOf(env.oneOf('LEVEL', LEVELS)).toEqualTypeOf<
    'debug' | 'info' | 'warn' | undefined
  >();
});

test('env (oneOf = readonly array of a wider type)', () => {
  const levels: readonly ('a' | 'b')[] = ['a', 'b'];
  const env = createEnvParser({ X: 'b' });

  expectTypeOf(env.oneOf('X', levels, 'a')).toEqualTypeOf<'a' | 'b'>();
  expect(env.oneOf('X', levels, 'a')).toBe('b');
});

/** Parse */

test('env (parse = transform)', () => {
  const env = createEnvParser({ URL: 'https://example.com/x' });
  const url = env.parse('URL', value => new URL(value));

  expect(url).toBeInstanceOf(URL);
  expect(url?.pathname).toBe('/x');
  expectTypeOf(url).toEqualTypeOf<URL | undefined>();
});

test('env (parse = default typed)', () => {
  const env = createEnvParser({});
  const port = env.parse('PORT', Number, 3000);

  expect(port).toBe(3000);
  expectTypeOf(port).toEqualTypeOf<number>();
});

test('env (parse = undefined or throw / default + warn)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { A: 'nope', B: 'boom' },
    { logger: { ...noopLogger, warn } },
  );

  expect(env.parse('A', () => undefined, 'dflt')).toBe('dflt');
  expect(
    env.parse(
      'B',
      () => {
        throw new Error('boom');
      },
      'dflt',
    ),
  ).toBe('dflt');

  expect(warn.mock.calls).toStrictEqual([
    ['Failed to parse env variable as "%s": %s', 'custom', 'A'],
    ['Failed to parse env variable as "%s": %s', 'custom', 'B'],
  ]);
});

/** List with allowed values and custom parsers */

test('env (list = allowed values)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { LEVELS: 'debug, warn ,verbose,info' },
    { logger: { ...noopLogger, warn } },
  );
  const levels = env.list('LEVELS', LEVELS);

  expect(levels).toStrictEqual(['debug', 'warn', 'info']);
  expectTypeOf(levels).toEqualTypeOf<('debug' | 'info' | 'warn')[]>();
  expect(warn).toHaveBeenCalledExactlyOnceWith(
    'Failed to parse env list item as "%s": %s[%d]',
    'oneOf',
    'LEVELS',
    2,
  );
});

test('env (list = allowed values / default)', () => {
  const env = createEnvParser({ LEVELS: 'verbose' });

  expect(env.list('LEVELS', LEVELS, ['info'])).toStrictEqual(['info']);
  expect(env.list('MISSING', LEVELS)).toStrictEqual([]);
});

test('env (list = custom parser)', () => {
  const warn = vi.fn();
  const env = createEnvParser(
    { URLS: 'https://a.io/x, nope ,https://b.io/y' },
    { logger: { ...noopLogger, warn } },
  );
  const urls = env.list('URLS', value => new URL(value));

  expect(urls.map(url => url.host)).toStrictEqual(['a.io', 'b.io']);
  expectTypeOf(urls).toEqualTypeOf<URL[]>();
  expect(warn).toHaveBeenCalledExactlyOnceWith(
    'Failed to parse env list item as "%s": %s[%d]',
    'custom',
    'URLS',
    1,
  );
});

test('env (list = custom parser returning undefined)', () => {
  const env = createEnvParser({ NUMS: '1,x,3' });
  const nums = env.list(
    'NUMS',
    value => (/^\d+$/.test(value) ? Number(value) : undefined),
    [0],
  );

  expect(nums).toStrictEqual([1, 3]);
  expectTypeOf(nums).toEqualTypeOf<number[]>();
});

test('env (list = built-in types keep their result types)', () => {
  const env = createEnvParser(ENV);

  expectTypeOf(env.list('list_int_correct', 'int')).toEqualTypeOf<number[]>();
  expectTypeOf(env.list('list_bool_correct', 'bool')).toEqualTypeOf<
    boolean[]
  >();
  expectTypeOf(env.list('list_string_correct', 'string')).toEqualTypeOf<
    string[]
  >();
});
