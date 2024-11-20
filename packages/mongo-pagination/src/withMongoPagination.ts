import type { FindCursor } from 'mongodb';
import { QueryAdapterMongodb } from './QueryAdapterMongodb';
import { QueryPaginator, type QueryPaginatorOptions } from './QueryPaginator';

type ExtractSchema<T> = T extends FindCursor<infer X> ? X : never;

/**
 * Enhances a MongoDB `FindCursor` with pagination capabilities.
 *
 * @param cursor - The MongoDB cursor to be paginated.
 * @param [options] - Optional configuration for pagination.
 *
 * @example
 * // Basic usage with a MongoDB cursor:
 * import { MongoClient } from 'mongodb';
 *
 * async function paginateCollection() {
 *   const client = new MongoClient('mongodb://localhost:27017');
 *   await client.connect();
 *
 *   const db = client.db('exampleDb');
 *   const collection = db.collection('exampleCollection');
 *
 *   const cursor = collection.find({ status: 'active' });
 *
 *   const paginator = withMongoPagination(cursor, {
 *     paginationFields: ['_id'],
 *     next: null,
 *   });
 *
 *   const result = await paginator.exec();
 *   console.log(result.items); // Logs the items for the current page
 *   console.log(result.metadata); // Logs pagination metadata
 * }
 *
 *
 * @example
 * // Using a custom preQuery callback:
 * const paginator = withMongoPagination(cursor, {
 *   preQuery: function () {
 *     console.log('Executing query...');
 *   },
 * });
 *
 * const result = await paginator.exec();
 * console.log(result.items);
 *
 * @group Main
 */
export function withMongoPagination<T extends FindCursor>(
  cursor: T,
  options?: QueryPaginatorOptions,
): QueryPaginator<ExtractSchema<T>> {
  const adapter = new QueryAdapterMongodb(cursor);
  const pagin = new QueryPaginator(adapter, options);

  return pagin;
}
