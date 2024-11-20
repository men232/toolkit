import type { Readable } from 'node:stream';
import { beforeAll, describe, expect, it } from 'vitest';
import { Token } from '../Token';
import { tweakQuery } from '../utils/query';
import { TestQueryAdapter } from './TestQueryAdapter';
import { setupMongodb, setupMongoose7, setupMongoose8 } from './mongodb';
import {
  type GenericQueryRunner,
  mongodbQueryRunner,
  mongooseQueryRunner,
} from './queryRunner';
import { setupUserSeeds } from './seeds';

const mongodb = setupMongodb(async client => {
  await client.db().collection('users').deleteMany({});
});

const mongoose7 = setupMongoose7();
const mongoose8 = setupMongoose8();

beforeAll(async () => {
  await setupUserSeeds(mongodb, 1000);
});

describe('query', () => {
  describe('tweak', () => {
    it('should handle query without options', () => {
      const query = new TestQueryAdapter();
      tweakQuery({ query, paginationFields: [] });

      expect(query.getOptions()).toStrictEqual({
        limit: 11,
        sort: { _id: -1 },
      });
    });

    it('should handle query with options', () => {
      const query = new TestQueryAdapter();
      query.setOptions({ limit: 15, sort: { createdAt: -1 } });

      tweakQuery({ query, paginationFields: [] });

      expect(query.getOptions()).toStrictEqual({
        limit: 16,
        sort: { createdAt: -1 },
      });
    });

    it('should validate pagination fields', () => {
      const query = new TestQueryAdapter();
      query.setOptions({ sort: { createdAt: -1, _id: -1 } });

      expect(() =>
        tweakQuery({ query, paginationFields: ['status'] }),
      ).toThrowError('must ends with');
    });
  });

  describe('mongodb', () => {
    makeQueryTest(mongodbQueryRunner(mongodb, 'users'));
  });

  describe('mongoose ' + mongoose7.version, () => {
    const User = mongoose7.model(
      'User',
      new mongoose7.Schema({
        _id: { type: Number },
        name: String,
        email: String,
        createdAt: Date,
      }),
    );

    makeQueryTest(mongooseQueryRunner(User as any));
  });

  describe('mongoose ' + mongoose8.version, () => {
    const User = mongoose8.model(
      'User',
      new mongoose8.Schema({
        _id: { type: Number },
        name: String,
        email: String,
        createdAt: Date,
      }),
    );

    makeQueryTest(mongooseQueryRunner(User));
  });
});

function makeQueryTest(runner: GenericQueryRunner) {
  it('first page { _id: -1 }', async () => {
    await tryFirstPage({ _id: -1 });
  });

  it('second page { _id: -1 }', async () => {
    await trySecondPage({ _id: -1 });
  });

  it('last page { _id: -1 }', async () => {
    await tryLastPage({ _id: -1 });
  });

  it('first page { createdAt: -1 }', async () => {
    await tryFirstPage({ createdAt: -1 });
  });

  it('second page { createdAt: -1 }', async () => {
    await trySecondPage({ createdAt: -1 });
  });

  it('last page { createdAt: -1 }', async () => {
    await tryLastPage({ createdAt: -1 });
  });

  it('first page { createdAt: -1, _id: -1 }', async () => {
    await tryFirstPage({ createdAt: -1, _id: -1 });
  });

  it('second page { createdAt: -1, _id: -1 }', async () => {
    await trySecondPage({ createdAt: -1, _id: -1 });
  });

  it('last page { createdAt: -1, _id: -1 }', async () => {
    await tryLastPage({ createdAt: -1, _id: -1 });
  });

  it('stream first page { createdAt: -1, _id: -1 }', async () => {
    const sort: Record<string, any> = { createdAt: -1, _id: -1 };

    const nativeResult = await runner.find({}, { sort, limit: 10 });

    const dbStream = await runner.pagin({}, { sort }).stream();

    const paginItems = await toArray(dbStream);

    expect(paginItems.length).toEqual(nativeResult.length);

    expect(paginItems[0]._id.toString()).toEqual(
      nativeResult[0]._id.toString(),
    );

    expect(paginItems.at(-1)._id.toString()).toEqual(
      nativeResult.at(-1)!._id.toString(),
    );
  });

  it('stream second page { createdAt: -1, _id: -1 }', async () => {
    const sort: Record<string, any> = { createdAt: -1, _id: -1 };

    const nativeResult = await runner.find({}, { sort, limit: 10, skip: 10 });

    const firstPage = await runner.pagin({}, { sort });

    const dbStream = await runner
      .pagin({}, { sort }, { next: firstPage.metadata.next })
      .stream();

    const paginItems = await toArray(dbStream);

    expect(paginItems.length).toEqual(nativeResult.length);

    expect(paginItems[0]._id.toString()).toEqual(
      nativeResult[0]._id.toString(),
    );

    expect(paginItems.at(-1)._id.toString()).toEqual(
      nativeResult.at(-1)!._id.toString(),
    );
  });

  async function tryFirstPage(sort: Record<string, any>, debug?: boolean) {
    const nativeResult = await runner.find({}, { sort, limit: 10 });

    const paginResult = await runner.pagin({}, { sort }, { debugQuery: debug });

    expect(paginResult.items.length).toEqual(nativeResult.length);

    expect(paginResult.items[0]._id.toString()).toEqual(
      nativeResult[0]._id.toString(),
    );

    expect(paginResult.items.at(-1)!._id.toString()).toEqual(
      nativeResult.at(-1)!._id.toString(),
    );
  }

  async function trySecondPage(sort: Record<string, any>) {
    const nativeResult = await runner.find({}, { sort, skip: 10, limit: 10 });

    const firstPage = await runner.pagin({}, { sort });

    const secondPage = await runner.pagin(
      {},
      { sort },
      {
        next: firstPage.metadata.next,
      },
    );

    expect(secondPage.items.length).toEqual(nativeResult.length);

    expect(secondPage.items[0]._id.toString()).toEqual(
      nativeResult[0]._id.toString(),
    );

    expect(secondPage.items.at(-1)!._id.toString()).toEqual(
      nativeResult.at(-1)!._id.toString(),
    );
  }

  async function tryLastPage(sortDirection: Record<string, any>) {
    const reversedSort = (() => {
      const result: Record<string, any> = {};

      for (const [key, value] of Object.entries(sortDirection)) {
        result[key] = value === 1 ? -1 : 1;
      }

      return result;
    })();

    const nativeResult = await runner.find(
      {},
      { sort: reversedSort, limit: 11 },
    );

    const lastItem = nativeResult.pop()!;

    const sortValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(sortDirection)) {
      sortValues[key] = lastItem[key];
    }

    nativeResult.reverse();

    const paginResult = await runner.pagin(
      {},
      {},
      {
        next: new Token({
          schemaVersion: 1,
          modelName: runner.modelName,
          sortDirection,
          sortValues,
        }).stringify(),
      },
    );

    expect(paginResult.items.length).toEqual(nativeResult.length);

    expect(paginResult.items[0]._id.toString()).toEqual(
      nativeResult[0]._id.toString(),
    );

    expect(paginResult.items.at(-1)!._id.toString()).toEqual(
      nativeResult.at(-1)!._id.toString(),
    );

    expect(paginResult.metadata.hasNext).toEqual(false);

    expect(paginResult.metadata.next).toEqual(null);
  }
}

function toArray(stream: Readable): Promise<any[]> {
  return new Promise((resolve, reject) => {
    let arr: any[] = [];

    stream.on('data', onData);
    stream.on('end', onEnd);
    stream.on('error', onError);
    stream.on('close', onClose);

    function onData(doc: any) {
      arr.push(doc);
    }

    function onEnd() {
      resolve(arr);
      cleanup();
    }

    function onError(err: unknown) {
      reject(err);
      cleanup();
    }

    function onClose() {
      resolve(arr);
      cleanup();
    }

    function cleanup() {
      stream.removeListener('data', onData);
      stream.removeListener('end', onEnd);
      stream.removeListener('error', onEnd);
      stream.removeListener('close', onClose);
    }
  });
}
