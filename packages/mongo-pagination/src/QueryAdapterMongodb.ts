import type { FindCursor, FindOptions } from 'mongodb';
import type { Readable } from 'node:stream';
import type { QueryAdapter } from './QueryAdapter';

export class QueryAdapterMongodb<T = any>
  implements QueryAdapter.QueryAdapter<T>
{
  constructor(private cursor: FindCursor) {}

  getModelName(): string {
    return this.cursor.namespace.collection!;
  }

  getOptions(): QueryAdapter.Options {
    const findOptions = (this.cursor as any).findOptions as FindOptions;

    return {
      limit: findOptions.limit,
      sort: findOptions.sort,
    };
  }

  getFilter(): QueryAdapter.Filter {
    return (this.cursor as any).cursorFilter;
  }

  setOptions({ limit, sort }: QueryAdapter.Options): void {
    if (limit !== undefined) this.cursor.limit(limit);
    if (sort !== undefined) this.cursor.sort(sort);
  }

  setFilter(filter: QueryAdapter.Filter): void {
    this.cursor.filter(filter);
  }

  toArray(): Promise<T[]> {
    return this.cursor.toArray();
  }

  stream(): Readable {
    return this.cursor.stream();
  }
}
