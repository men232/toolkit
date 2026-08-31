import { describe, expect, it } from 'vitest';
import { createStdout } from './create-stdout';

describe('createStdout', () => {
  it('records writes and returns the last non-empty one', () => {
    const stdout = createStdout(40);

    stdout.write('first');
    stdout.write('');
    stdout.write('second');

    expect(stdout.columns).toBe(40);
    expect(stdout.isTTY).toBe(true);
    expect(stdout.get()).toBe('second');
    expect(stdout.getWrites()).toEqual(['first', '', 'second']);
  });

  it('provides no-op cursor methods matching a real WriteStream', () => {
    const stdout = createStdout();

    expect(() => {
      stdout.cursorTo(0, 0);
      stdout.clearLine(1);
    }).not.toThrow();
  });
});
