import { describe, expect, test } from 'vitest';
import { sprintf } from './sprintf';

describe('sprintf', () => {
  test('%s', () => {
    expect(sprintf('Hello %s?', ['World'])).toBe('Hello World?');
  });

  test('%d', () => {
    expect(sprintf('count: %d', [15])).toBe('count: 15');
  });

  test('%i', () => {
    expect(sprintf('factor: %i', [3.25])).toBe('factor: 3');
  });

  test('%o', () => {
    expect(sprintf('user: %o', [{ name: 'andrew' }])).toBe(
      'user: {"name":"andrew"}',
    );
  });

  test('%o with fn', () => {
    expect(sprintf('fn: %o', [sprintf])).toBe('fn: sprintf');
  });

  test('%o with str', () => {
    expect(sprintf('fn: %o', ['sprintf'])).toBe("fn: 'sprintf'");
  });

  test('leftArgs', () => {
    const leftArgs: any[] = [];

    sprintf('fn: %o', ['sprintf', 'a', 'b', 'c'], leftArgs);

    expect(leftArgs).toStrictEqual(['a', 'b', 'c']);
  });
});
