import { expect, test } from 'vitest';
import { createEnvParser } from './env';

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

test('env (int = with decimal)', () => {
  const env = createEnvParser(ENV);

  expect(env.int('int_decimal')).toBe(150);
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
