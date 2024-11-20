import type { Query } from 'mongoose';
import type { QueryPaginator, QueryPaginatorOptions } from './QueryPaginator';
import { withMongoosePagination } from './withMongoosePagination';

type MongooseQuery = Query<any, any> & {
  /** @internal */
  _paginator?: QueryPaginator;
};

export default function setupPlugin(mongoose: any) {
  const Query = mongoose.Query;

  Query.prototype.paginator = paginator;
  Query.prototype.paginatorNext = paginatorNext;
}

function paginator(this: MongooseQuery, options: QueryPaginatorOptions = {}) {
  const query = this;

  if (arguments.length === 0 && query._paginator) {
    return query._paginator;
  }

  query._paginator = withMongoosePagination(query, options);

  return query._paginator;
}

function paginatorNext(this: MongooseQuery, nextToken: string) {
  const query = this;

  if (arguments.length === 0 && query._paginator) {
    return query._paginator;
  }

  query._paginator = withMongoosePagination(query, {
    next: nextToken,
  });

  return query._paginator;
}

declare module 'mongoose' {
  /**
   * Patch original mongoose types
   */
  // @ts-expect-error
  class Query<
    ResultType,
    DocType,
    THelpers = {},
    RawDocType = unknown,
    QueryOp = 'find',
    TInstanceMethods = Record<string, never>,
  > implements SessionOperation
  {
    paginator(options?: QueryPaginatorOptions): QueryPaginator<ResultType>;
    paginatorNext(nextToken: string): QueryPaginator<ResultType>;
  }
}
