import { expect, test } from 'vitest';
import { pick } from './pick';

test('pick', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(pick(user, ['id'])).toStrictEqual({
    id: user.id,
  });
});

test('pick (with not exists fields)', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(pick(user, ['id', 'roles'])).toStrictEqual({
    id: user.id,
  });
});
