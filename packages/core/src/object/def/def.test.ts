import { catchError } from '@/catchError';
import { expect, test } from 'vitest';
import { def } from './def';

test('def (defaults)', () => {
  const flag = Symbol();
  const obj = {};

  def(obj, flag, true);

  expect((obj as any)[flag]).toBe(true);
});

test('def (not enumerable)', () => {
  const flag = Symbol();
  const obj = {};

  def(obj, flag, true);

  expect(Object.keys(obj).includes(flag as any)).toBe(false);
});

test('def (not writable)', () => {
  const flag = Symbol();
  const obj = {};

  def(obj, flag, true);

  const [error] = catchError(() => {
    (obj as any)[flag] = false;
  });

  expect(!!error).toBe(true);
});

test('def (writable)', () => {
  const flag = Symbol();
  const obj = {};

  def(obj, flag, true, true);

  const [error] = catchError(() => {
    (obj as any)[flag] = false;
  });

  expect(!error).toBe(true);
});
