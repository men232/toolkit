import { expect, test } from 'vitest';
import { flagsToMap } from './flagsToMap';

const PERMISSIONS = {
  USER_CREATE: 1 << 0,
  USER_UPDATE: 1 << 1,
  USER_DELETE: 1 << 2,
  USER_LIST: 1 << 4,
} as const;

test('flagsToMap (defaults)', () => {
  const flag = Symbol();

  const scope = PERMISSIONS.USER_CREATE | PERMISSIONS.USER_LIST;

  const result = flagsToMap(scope, PERMISSIONS);

  expect(result).toStrictEqual({
    USER_CREATE: true,
    USER_UPDATE: false,
    USER_DELETE: false,
    USER_LIST: true,
  });
});
