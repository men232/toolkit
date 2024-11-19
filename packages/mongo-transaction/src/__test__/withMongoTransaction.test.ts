import { defer, env, noop } from '@andrew_l/toolkit';
import { MongoClient, ServerApiVersion } from 'mongodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { onCommitted, onRollback } from '../hooks';
import { withMongoTransaction } from '../withMongoTransaction';

const MONGODB_URI = env.string(
  'MONGODB_URI',
  'mongodb://127.0.0.1/mongo-transaction-test',
);

let MONGODB_CLIENT: MongoClient;

beforeAll(setupConnection);

afterAll(disconnectConnection);

describe('withMongoTransaction', () => {
  it('should returns function result', () => {
    const run = withMongoTransaction({
      connection: MONGODB_CLIENT,
      async fn(session) {
        // await MONGODB_CLIENT.db()
        //   .collection('users')
        //   .insertOne({ name: 'Andrew' }, { session });
        return 5;
      },
    });

    expect(run()).resolves.toBe(5);
  });

  it('should handle function arguments', async () => {
    const argsPassed = [1, 2, 3, 4];
    let argsReceived: any;

    const run = withMongoTransaction({
      connection: MONGODB_CLIENT,
      async fn(session, ...args: any[]) {
        argsReceived = args;
      },
    });

    await run(...argsPassed);

    expect(argsReceived).toStrictEqual(argsPassed);
  });

  it('should handle function this', async () => {
    const thisPassed = {};
    let thisReceived: any;

    const run = withMongoTransaction({
      connection: MONGODB_CLIENT,
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
      connection: MONGODB_CLIENT,
      async fn() {
        thisReceived = this;
      },
    });

    await run();
    expect(thisReceived).toBe(undefined);
  });

  it('should throw error when transaction aborted', async () => {
    const run = withMongoTransaction({
      connection: MONGODB_CLIENT,
      async fn(session) {
        await session.abortTransaction();
      },
    });

    expect(() => run()).rejects.toThrowError('aborted');
  });

  it('should rollback when transaction aborted', async () => {
    let rollback = false;
    const run = withMongoTransaction({
      connection: MONGODB_CLIENT,
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

    const collection = MONGODB_CLIENT.db().collection<{
      _id: number;
      value: number;
    }>('t_conflict');

    await collection.insertOne({ _id: 1, value: 0 });

    const lock = defer();
    const t1 = withMongoTransaction({
      connection: MONGODB_CLIENT,
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
      connection: MONGODB_CLIENT,
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
});

async function disconnectConnection() {
  if (!MONGODB_CLIENT) return;
  await MONGODB_CLIENT.close();
}

async function setupConnection() {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  await client.connect();
  await client.db('admin').command({ ping: 1 });

  await client.db().collection('users').deleteMany({});
  await client.db().collection('t_conflict').deleteMany({});

  MONGODB_CLIENT = client;
}
