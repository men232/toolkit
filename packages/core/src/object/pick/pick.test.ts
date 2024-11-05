import { describe, expect, test } from 'vitest';
import { pick } from './pick';

describe('pick', () => {
  test('must pick only provided keys', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(pick(user, ['id'])).toStrictEqual({
      id: user.id,
    });
  });

  test('must not define key in resulted object when key not exists', () => {
    const user = {
      id: 1,
      canRead: true,
      canWrite: true,
    };

    expect(pick(user, ['id', 'roles'])).toStrictEqual({
      id: user.id,
    });
  });
});
