import { expect, test } from 'vitest';
import { captureStackTrace } from './captureStackTrace';

function withPrepareStackTrace<T>(
  prepare: ErrorConstructor['prepareStackTrace'],
  fn: () => T,
): T {
  const original = Error.prepareStackTrace;
  Error.prepareStackTrace = prepare;

  try {
    return fn();
  } finally {
    Error.prepareStackTrace = original;
  }
}

function stackTill(): string {
  return captureStackTrace(stackTill);
}

function stackCaller(): string {
  return stackTill();
}

test('captureStackTrace (default V8 stack)', () => {
  const stack = withPrepareStackTrace(undefined, stackCaller);
  const [firstLine] = stack.split('\n');

  expect(firstLine).toMatch(/^ {4}at /);
  expect(firstLine).toContain('stackCaller');
  expect(stack).not.toContain('stackTill');
});

test('captureStackTrace (rewritten stack header)', () => {
  const stack = withPrepareStackTrace(
    (err, frames) =>
      `Error: ${err.message}\n` + frames.map(f => `    at ${f}`).join('\n'),
    stackCaller,
  );
  const [firstLine] = stack.split('\n');

  expect(firstLine).toMatch(/^ {4}at /);
  expect(firstLine).toContain('stackCaller');
});

test('captureStackTrace (stack without frames)', () => {
  expect(withPrepareStackTrace(() => 'Error', stackCaller)).toBe('');
  expect(withPrepareStackTrace(() => 'Error: boom', stackCaller)).toBe('');
  expect(withPrepareStackTrace(() => '', stackCaller)).toBe('');
});
