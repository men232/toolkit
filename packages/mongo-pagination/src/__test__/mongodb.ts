import { type Awaitable, env } from '@andrew_l/toolkit';
import { MongoClient, ServerApiVersion } from 'mongodb';
import mongoose7, { type Mongoose as MongooseV7 } from 'mongoose-v7';
import mongoose8, { type Mongoose as MongooseV8 } from 'mongoose-v8';
import { afterAll, beforeAll } from 'vitest';

const MONGODB_URI = env.string(
  'MONGODB_URI',
  'mongodb://127.0.0.1/mongo-pagination-test',
);

export function setupMongodb(
  cleanupFn?: (client: MongoClient) => Awaitable<void>,
): MongoClient {
  const client = new MongoClient(MONGODB_URI, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  beforeAll(async () => {
    await client.connect();
    await client.db('admin').command({ ping: 1 });

    if (cleanupFn) {
      await cleanupFn(client);
    }
  });

  afterAll(async () => {
    await client.close();
  });

  return client;
}

export function setupMongoose7(
  cleanupFn?: (client: MongooseV7) => Awaitable<void>,
): MongooseV7 {
  beforeAll(async () => {
    await mongoose7.connect(MONGODB_URI);

    if (cleanupFn) {
      await cleanupFn(mongoose7);
    }
  });

  afterAll(async () => {
    await mongoose7.disconnect();
  });

  return mongoose7;
}

export function setupMongoose8(
  cleanupFn?: (client: MongooseV8) => Awaitable<void>,
): MongooseV8 {
  beforeAll(async () => {
    await mongoose8.connect(MONGODB_URI);

    if (cleanupFn) {
      await cleanupFn(mongoose8);
    }
  });

  afterAll(async () => {
    await mongoose8.disconnect();
  });

  return mongoose8;
}
