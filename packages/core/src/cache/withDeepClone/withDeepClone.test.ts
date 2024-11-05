import { describe, expect, test } from 'vitest';
import { withDeepClone } from './withDeepClone';

describe('withDeepClone', () => {
  test('must clone object before return', () => {
    const user = { id: 1, name: 'Andrew' };

    const getUser = withDeepClone(() => user);

    const user2 = getUser();
    user2.id = 2;

    expect(user.id).lt(user2.id);
  });
});
