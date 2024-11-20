import type { MongoClient } from 'mongodb';
import type { Model } from 'mongoose';
import type { QueryPaginator, QueryPaginatorOptions } from '../QueryPaginator';
import { withMongoosePagination } from '../withMongoosePagination';
import { withMongoPagination } from '../withMongoPagination';

export type GenericQueryOptions = {
  sort?: Record<string, any>;
  limit?: number;
  skip?: number;
};

export type GenericQueryRunner = {
  find(
    filter?: Record<string, any>,
    options?: GenericQueryOptions,
  ): Promise<any[]>;
  pagin(
    filter?: Record<string, any>,
    options?: GenericQueryOptions,
    paginOptions?: QueryPaginatorOptions,
  ): QueryPaginator<any>;
  modelName: string;
};

export function mongodbQueryRunner(
  client: MongoClient,
  collectionName: string,
): GenericQueryRunner {
  const collection = client.db().collection(collectionName);

  return {
    modelName: collectionName,
    find(filter = {}, options) {
      return collection.find(filter, options).toArray();
    },
    pagin(filter = {}, options, paginOptions) {
      return withMongoPagination(
        collection.find(filter, options),
        paginOptions,
      );
    },
  };
}

export function mongooseQueryRunner(
  model: Model<any, any>,
): GenericQueryRunner {
  return {
    modelName: model.modelName,
    find(filter = {}, options) {
      return model.find(filter, {}, options).lean();
    },
    pagin(filter = {}, options, paginOptions) {
      return withMongoosePagination(
        model.find(filter, {}, options),
        paginOptions,
      );
    },
  };
}
