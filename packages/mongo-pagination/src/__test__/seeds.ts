import type { AnyBulkWriteOperation, MongoClient } from 'mongodb';

export async function setupUserSeeds(client: MongoClient, amount: number) {
  const now = Date.now();
  const users = client.db().collection('users');
  const bulkOps: AnyBulkWriteOperation[] = [];

  for (let id = 0; id < 1000; id++) {
    bulkOps.push({
      insertOne: {
        document: {
          _id: id as any,
          name: `User ${id + 1}`,
          email: `user${id + 1}@test.com`,
          createdAt: new Date(now - id * 1000 * 60 * 60 * 24),
        },
      },
    });
  }

  await users.bulkWrite(bulkOps);
}
