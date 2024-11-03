import { catchError } from '@/catchError';
import { expect, test } from 'vitest';
import { deepFreeze } from './deepFreeze';

test('deepFreeze', () => {
  const config = deepFreeze({
    url: 'ws://...',
    db: {
      username: '',
      password: '',
      replicas: [{ set: 1 }],
    },
  });

  const [firstLevelError] = catchError(() => {
    config.url = 'new_url';
  });

  const [secondLevelError] = catchError(() => {
    config.db.username = 'andrew';
  });

  const [arrayLevelError] = catchError(() => {
    config.db.replicas[0].set = 2;
  });

  expect(!!firstLevelError).toBe(true);
  expect(!!secondLevelError).toBe(true);
  expect(!!arrayLevelError).toBe(true);
});
