import type { Sort } from 'mongodb';
import type { Readable } from 'node:stream';

export namespace QueryAdapter {
  export type Options = {
    sort?: Sort;
    limit?: number;
  };

  export type Filter = Record<string, any>;

  export interface QueryAdapter<T = any> {
    getModelName(): string;

    getOptions(): Options;
    getFilter(): Filter;

    setOptions(options: Options): void;
    setFilter(filter: Filter): void;

    toArray(): Promise<T[]>;

    stream(): Readable;
  }
}
