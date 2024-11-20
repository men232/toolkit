import { describe, expect, it } from 'vitest';
import { useMongoSession } from '../hooks/useMongoSession';
import { isClientSessionLike } from '../utils';
import { withMongoTransaction } from '../withMongoTransaction';
import { setupMongodb } from './mongodb';

const MONGODB_CLIENT = setupMongodb();

describe('useMongoSession', () => {
  it('should returns null outside transaction scope', () => {
    let received: any;

    const run = () => {
      received = useMongoSession();
    };

    run();
    expect(received).toBe(null);
  });

  it('should returns ClientSession inside transaction scope', async () => {
    let received: any;
    const run = withMongoTransaction(MONGODB_CLIENT, () => {
      received = useMongoSession();
    });

    await run();

    expect(isClientSessionLike(received)).toBe(true);
  });
});
