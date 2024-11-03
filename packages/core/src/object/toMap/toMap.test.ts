import { expect, test } from 'vitest';
import { toMap } from './toMap';

test('toMap', () => {
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
