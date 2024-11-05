import { describe, expect, test } from 'vitest';
import { toMap } from './toMap';

describe('toMap', () => {
  test('regular keys', () => {
    const user = {
      user1: 'Andrew',
      user2: 'John',
    };

    expect(toMap(user)).toStrictEqual(
      new Map([
        ['user1', 'Andrew'],
        ['user2', 'John'],
      ]),
    );
  });

  test('symbol keys', () => {
    const sym = Symbol();
    const user = {
      user1: 'Andrew',
      [sym]: 'John',
    };

    expect(toMap(user)).toStrictEqual(
      new Map([
        ['user1', 'Andrew'],
        [sym, 'John'],
      ] as any),
    );
  });
});
