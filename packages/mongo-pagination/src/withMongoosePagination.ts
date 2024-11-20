import type { Query } from 'mongoose';
import { QueryAdapterMongoose } from './QueryAdapterMongoose';
import { QueryPaginator, type QueryPaginatorOptions } from './QueryPaginator';

type AnyQuery = Query<any, any>;

type ExtractDocType<T> = T extends Query<infer X, any> ? X : never;

/**
 * Enhances a Mongoose query with pagination capabilities.
 *
 * @param query - The Mongoose query to be paginated.
 * @param [options] - Optional configuration for pagination.
 *
 * @example
 * // Basic usage with a Mongoose query:
 * import { withMongoosePagination } from './pagination';
 * import mongoose from 'mongoose';
 *
 * async function paginateMongooseQuery() {
 *   const User = mongoose.model('User', new mongoose.Schema({ name: String, status: String }));
 *
 *   const query = User.find({ status: 'active' });
 *
 *   const paginator = withMongoosePagination(query, {
 *     paginationFields: ['_id'],
 *     next: null,
 *   });
 *
 *   const result = await paginator.exec();
 *   console.log(result.items); // Logs the items for the current page
 *   console.log(result.metadata); // Logs pagination metadata
 * }
 *
 * @example
 * // Using custom preQuery and postQuery callbacks:
 * const paginator = withMongoosePagination(query, {
 *   preQuery: function () {
 *     console.log('Before executing the query');
 *   },
 *   postQuery: function () {
 *     console.log('After executing the query');
 *   },
 * });
 *
 * const result = await paginator.exec();
 * console.log(result.items); // Logs items for the current page
 * console.log(result.metadata); // Logs pagination metadata
 *
 * @group Main
 */
export function withMongoosePagination<T extends AnyQuery>(
  query: T,
  options?: QueryPaginatorOptions,
): QueryPaginator<ExtractDocType<T>> {
  const adapter = new QueryAdapterMongoose(query);
  const pagin = new QueryPaginator(adapter, options);

  return pagin;
}
