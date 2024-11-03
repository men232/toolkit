import { expect, test } from 'vitest';
import { omitPrefixed } from './omitPrefixed';

test('omitPrefixed', () => {
  const user = {
    id: 1,
    canRead: true,
    canWrite: true,
  };

  expect(omitPrefixed(user, 'can')).toStrictEqual({
    id: user.id,
  });
});
