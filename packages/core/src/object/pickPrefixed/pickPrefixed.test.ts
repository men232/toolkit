import { expect, test } from 'vitest';
import { pickPrefixed } from './pickPrefixed';

test('pickPrefixed (defaults)', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(pickPrefixed(user, 'can')).toStrictEqual({
    canRead: user.canRead,
    canWrite: user.canWrite,
  });
});

test('pickPrefixed (prefixTrim)', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(pickPrefixed(user, { prefix: 'can', prefixTrim: true })).toStrictEqual(
    {
      Read: user.canRead,
      Write: user.canWrite,
    },
  );
});
