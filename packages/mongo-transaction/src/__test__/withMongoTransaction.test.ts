import { defer, isFunction, noop, noopLogger } from '@andrew_l/toolkit';
import type { ClientSession, Collection, MongoClient } from 'mongodb';
import { describe, expect, it, vi } from 'vitest';
import {
  onCommitted,
  onMongoSessionCommitted,
  onRollback,
  useTransactionEffect,
} from '../hooks';
import { isClientSessionLike } from '../utils';
import { withMongoTransaction } from '../withMongoTransaction';
import { setupMongodb, setupMongoose7, setupMongoose8 } from './mongodb';

describe('withMongoTransaction', () => {
  const sharedCleanup = async (client: MongoClient) => {
    await client.db().collection('users').deleteMany({});
    await client.db().collection('t_conflict').deleteMany({});
    await client.db().collection('t_retry').deleteMany({});
  };

  describe('mongodb driver', () => {
    const client = setupMongodb(sharedCleanup);

    makeTest(client);
  });

  describe('mongoose v7', () => {
    const mongoose = setupMongoose7(async mongoose => {
      const client = mongoose.connection.getClient();
      await sharedCleanup(client as any);
    });

    makeTest(() => mongoose.connection.getClient() as any);
  });

  describe('mongoose v8', () => {
    const mongoose = setupMongoose8(async mongoose => {
      const client = mongoose.connection.getClient();
      await sharedCleanup(client as any);
    });

    makeTest(() => mongoose.connection.getClient() as any);
  });
});

function makeTest(clientValue: MongoClient | (() => MongoClient)) {
  it('should returns function result', async () => {
    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        return 5;
      },
    });

    await expect(run()).resolves.toBe(5);
  });

  it('should handle function arguments', async () => {
    const argsPassed = [1, 2, 3, 4];
    let argsReceived: any;

    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session, ...args: any[]) {
        argsReceived = args;
      },
    });

    await run(...argsPassed);

    expect(argsReceived).toStrictEqual(argsPassed);
  });

  it('should provide session as first argument', async () => {
    let argsReceived: any;

    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        argsReceived = session;
      },
    });

    await run();

    expect(isClientSessionLike(argsReceived)).toBe(true);
  });

  it('should handle function this', async () => {
    const thisPassed = {};
    let thisReceived: any;

    const run = withMongoTransaction({
      connection: clientValue,
      async fn() {
        thisReceived = this;
      },
    });

    await run.call(thisPassed);

    expect(thisPassed).toBe(thisReceived);
  });

  it('should handle this undefined by default', async () => {
    let thisReceived: any;

    const run = withMongoTransaction({
      connection: clientValue,
      async fn() {
        thisReceived = this;
      },
    });

    await run();
    expect(thisReceived).toBe(undefined);
  });

  it('should throw error when transaction aborted', async () => {
    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        await session.abortTransaction();
      },
    });

    await expect(() => run()).rejects.toThrowError('aborted');
  });

  it('should rollback when transaction aborted', async () => {
    let rollback = false;
    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        onRollback(() => void (rollback = true));

        await session.abortTransaction();
      },
    });

    await run().catch(noop);

    expect(rollback).toBe(true);
  });

  it('should handle transaction conflict', async () => {
    let t1Attempts = 0;
    let t2Attempts = 0;
    let t2Rollback = false;
    let t2Committed = false;
    let t2Error: any;

    const client = isFunction(clientValue) ? clientValue() : clientValue;

    const collection = client.db().collection<{
      _id: number;
      value: number;
    }>('t_conflict');

    await collection.insertOne({ _id: 1, value: 0 });

    const lock = defer();
    const t1 = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        t1Attempts++;
        const doc = await collection.findOne({ _id: 1 }, { session });

        await collection.updateOne(
          { _id: 1 },
          { $set: { value: doc!.value + 1 } },
          { session },
        );

        await lock.promise;
      },
    });

    const t2 = withMongoTransaction({
      connection: clientValue,
      timeoutMS: 100,
      async fn(session) {
        t2Attempts++;

        onRollback(() => void (t2Rollback = true));
        onCommitted(() => void (t2Committed = true));

        const doc = await collection.findOne({ _id: 1 }, { session });

        await collection.updateOne(
          { _id: 1 },
          { $set: { value: doc!.value + 1 } },
          { session },
        );
      },
    });

    await Promise.all([
      t1().catch(noop),
      t2()
        .catch(err => void (t2Error = err))
        .then(lock.resolve),
    ]);

    expect(t1Attempts).toBe(1);
    expect(t2Attempts).greaterThan(1);
    expect(t2Committed).toBe(false);
    expect(t2Rollback).toBe(true);
    expect(() => {
      throw t2Error;
    }).toThrowError('client-side timeout');
  });

  describe('onMongoSessionCommitted', () => {
    it('should not call fn when transaction rolled back by error', async () => {
      let calls = 0;
      let promise: Promise<unknown> | undefined;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          promise = onMongoSessionCommitted(session, () => ++calls).promise;
          throw new Error('rollback me');
        },
      });

      await expect(run()).rejects.toThrowError('rollback me');
      await expect(promise).resolves.toBeUndefined();
      expect(calls).toBe(0);
    });

    it('should not call fn when transaction explicitly aborted', async () => {
      let calls = 0;
      let promise: Promise<unknown> | undefined;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          promise = onMongoSessionCommitted(() => ++calls).promise;
          await session.abortTransaction();
        },
      });

      await expect(run()).rejects.toThrowError('aborted');
      await expect(promise).resolves.toBeUndefined();
      expect(calls).toBe(0);
    });

    it('should call fn and resolve its result when committed', async () => {
      const client = isFunction(clientValue) ? clientValue() : clientValue;
      const collection = client.db().collection('t_retry');
      let promise: Promise<unknown> | undefined;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          promise = onMongoSessionCommitted(session, () => 'done').promise;
          await collection.insertOne({}, { session });
        },
      });

      await run();
      await expect(promise).resolves.toBe('done');
    });

    it('should call fn when committed empty', async () => {
      let promise: Promise<unknown> | undefined;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn() {
          promise = onMongoSessionCommitted(() => 'empty').promise;
        },
      });

      await run();
      await expect(promise).resolves.toBe('empty');
    });
  });

  it('should log effect error to the provided logger', async () => {
    const effectError = new Error('apply failed');
    const logError = vi.fn();

    const run = withMongoTransaction({
      connection: clientValue,
      logger: { ...noopLogger, error: logError },
      async fn() {
        await useTransactionEffect(() => Promise.reject(effectError));
      },
    });

    await expect(run()).rejects.toBe(effectError);
    expect(logError).toHaveBeenCalledTimes(1);
    expect(logError.mock.calls[0]).toContain(effectError);
  });

  it('should reject with the transaction error when effect cleanup fails', async () => {
    let rolledBack = false;

    const run = withMongoTransaction({
      connection: clientValue,
      logger: noopLogger,
      async fn() {
        await useTransactionEffect(() => () => {
          throw new Error('cleanup failed');
        });
        onRollback(() => void (rolledBack = true));

        throw new Error('rollback me');
      },
    });

    await expect(run()).rejects.toThrowError('rollback me');
    expect(rolledBack).toBe(true);
  });

  it('should call every onRollback hook', async () => {
    const calls: string[] = [];

    const run = withMongoTransaction({
      connection: clientValue,
      async fn() {
        onRollback(() => void calls.push('first'));
        onRollback(() => void calls.push('second'));
        throw new Error('rollback me');
      },
    });

    await expect(run()).rejects.toThrowError('rollback me');
    expect(calls.sort()).toStrictEqual(['first', 'second']);
  });

  it('should call each onCommitted once when mixed with onRollback on retry', async () => {
    const conflict = await setupRetryConflict(clientValue, 'mixed-retry');

    let attempts = 0;
    const committed: Record<string, number> = {};
    const rolledBack: string[] = [];

    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        attempts++;

        onRollback(() => void rolledBack.push('r1'));
        onCommitted(() => void (committed.c1 = (committed.c1 ?? 0) + 1));
        onRollback(() => void rolledBack.push('r2'));
        onCommitted(() => void (committed.c2 = (committed.c2 ?? 0) + 1));

        await conflict(session, attempts === 1);
      },
    });

    await run();

    expect(attempts).toBe(2);
    expect(committed).toStrictEqual({ c1: 1, c2: 1 });
    expect(rolledBack).toStrictEqual([]);
  });

  it('should keep effects in their slots on retry', async () => {
    const conflict = await setupRetryConflict(clientValue, 'effects-retry');

    let attempts = 0;
    const calls = { aSetup: 0, aCleanup: 0, bSetup: 0, bCleanup: 0 };

    const run = withMongoTransaction({
      connection: clientValue,
      async fn(session) {
        const attempt = ++attempts;

        await useTransactionEffect(() => {
          calls.aSetup++;
          return () => void calls.aCleanup++;
        });

        await useTransactionEffect(
          () => {
            calls.bSetup++;
            return () => void calls.bCleanup++;
          },
          { dependencies: [attempt] },
        );

        await conflict(session, attempt === 1);
      },
    });

    await run();

    expect(attempts).toBe(2);
    expect(calls).toStrictEqual({
      aSetup: 1,
      aCleanup: 0,
      bSetup: 2,
      bCleanup: 1,
    });
  });

  describe('flush: post', () => {
    it('should apply after callback and before commit', async () => {
      const order: string[] = [];
      let inTransaction: boolean | undefined;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          onCommitted(() => void order.push('committed'));

          await useTransactionEffect(
            () => {
              inTransaction = session.inTransaction();
              order.push('post');
            },
            { flush: 'post' },
          );

          order.push('callback');
        },
      });

      await run();

      expect(inTransaction).toBe(true);
      expect(order).toStrictEqual(['callback', 'post', 'committed']);
    });

    it('should apply once when commit is retried', async () => {
      const failCommit = await setupCommitFailure(clientValue);

      let attempts = 0;
      let applied = 0;

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          attempts++;

          await useTransactionEffect(() => void applied++, { flush: 'post' });

          if (attempts === 1) {
            failCommit(session, ['TransientTransactionError']);
          }
        },
      });

      await run();

      expect(attempts).toBe(2);
      expect(applied).toBe(1);
    });

    it('should clean up when commit fails', async () => {
      const failCommit = await setupCommitFailure(clientValue);
      const calls = { applied: 0, cleaned: 0, committed: 0 };

      const run = withMongoTransaction({
        connection: clientValue,
        async fn(session) {
          onCommitted(() => void calls.committed++);

          await useTransactionEffect(
            () => {
              calls.applied++;
              return () => void calls.cleaned++;
            },
            { flush: 'post' },
          );

          failCommit(session, []);
        },
      });

      await expect(run()).rejects.toThrowError('simulated commit failure');
      expect(calls).toStrictEqual({ applied: 1, cleaned: 1, committed: 0 });
    });

    it('should roll back transaction when it throws', async () => {
      const client = isFunction(clientValue) ? clientValue() : clientValue;
      const collection = client.db().collection('t_retry');
      const marker = { post: 'throws' };
      let rolledBack = false;

      const run = withMongoTransaction({
        connection: clientValue,
        logger: noopLogger,
        async fn(session) {
          onRollback(() => void (rolledBack = true));

          await useTransactionEffect(
            () => {
              throw new Error('post failed');
            },
            { flush: 'post' },
          );

          await collection.insertOne({ ...marker }, { session });
        },
      });

      await expect(run()).rejects.toThrowError('post failed');
      expect(rolledBack).toBe(true);
      await expect(collection.countDocuments(marker)).resolves.toBe(0);
    });
  });
}

// With `force`, the session write fails with WriteConflict (TransientTransactionError)
// and the driver retries the callback.
async function setupRetryConflict(
  clientValue: MongoClient | (() => MongoClient),
  docId: string,
) {
  const client = isFunction(clientValue) ? clientValue() : clientValue;
  const collection: Collection<{ _id: string; value: number }> = client
    .db()
    .collection('t_retry');

  await collection.updateOne(
    { _id: docId },
    { $set: { value: 0 } },
    { upsert: true },
  );

  return async (session: ClientSession, force: boolean) => {
    // Pin the transaction snapshot, then change the document outside of it.
    await collection.findOne({ _id: docId }, { session });

    if (force) {
      await collection.updateOne({ _id: docId }, { $inc: { value: 1 } });
    }

    await collection.updateOne(
      { _id: docId },
      { $inc: { value: 1 } },
      { session },
    );
  };
}

// The local mongod has no failpoints, so the next commitTransaction is replaced with
// a server-side abort plus a MongoServerError carrying the given labels.
async function setupCommitFailure(
  clientValue: MongoClient | (() => MongoClient),
) {
  const client = isFunction(clientValue) ? clientValue() : clientValue;

  // MongoServerError must come from the driver instance behind this client (mongoose bundles its own).
  const ServerError: new (description: object) => Error = await client
    .db()
    .command({ simulatedUnknownCommand: 1 })
    .then(
      () => Promise.reject(new Error('Expected command to fail')),
      err => err.constructor,
    );

  return (session: ClientSession, errorLabels: string[]) => {
    const commitTransaction = session.commitTransaction;

    session.commitTransaction = function () {
      session.commitTransaction = commitTransaction;

      return session.abortTransaction().then(() =>
        Promise.reject(
          new ServerError({
            errmsg: 'simulated commit failure',
            code: 251,
            codeName: 'NoSuchTransaction',
            errorLabels,
          }),
        ),
      );
    };
  };
}
