import { expect, test } from 'vitest';
import { omit } from './omit';

test('omit', () => {
  const user = {
    id: 1,
    createdAt: new Date(0),
    details: {
      name: 'Andrew',
      roles: ['ADMIN'],
    },
  };

  expect(omit(user, ['details'])).toStrictEqual({
    id: user.id,
    createdAt: user.createdAt,
  });
});
