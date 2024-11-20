import { cleanEmpty } from '@andrew_l/toolkit';
import type { Query } from 'mongoose';
import type { Readable } from 'node:stream';
import type { QueryAdapter } from './QueryAdapter';

type AnyQuery = Query<any, any>;

export class QueryAdapterMongoose<T = any>
  implements QueryAdapter.QueryAdapter<T>
{
  constructor(private query: AnyQuery) {}

  getModelName(): string {
    return this.query.model.modelName;
  }

  getOptions(): QueryAdapter.Options {
    const options = this.query.getOptions();

    return {
      limit: options.limit,
      sort: options.sort,
    };
  }

  getFilter(): QueryAdapter.Filter {
    return this.query.getFilter();
  }

  setOptions({ limit, sort }: QueryAdapter.Options): void {
    this.query.setOptions(cleanEmpty({ limit, sort }));
  }

  setFilter(filter: QueryAdapter.Filter): void {
    this.query.setQuery(filter);
  }

  toArray(): Promise<T[]> {
    return this.query.exec();
  }

  stream(): Readable {
    return this.query.cursor();
  }
}
