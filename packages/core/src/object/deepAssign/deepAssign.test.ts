import { expect, test } from 'vitest';
import { deepAssign } from './deepAssign';

test('deepAssign', () => {
  const obj = {
    value: 0,
    user: {
      id: 1,
      name: 'Andrew',
    },
  };

  deepAssign(obj, {
    value: 1,
    user: {
      name: 'John',
    },
  });

  expect(obj).toStrictEqual({
    value: 1,
    user: {
      id: 1,
      name: 'John',
    },
  });
});
