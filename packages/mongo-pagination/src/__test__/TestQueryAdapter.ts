import type { Readable } from 'node:stream';
import type { QueryAdapter } from '../QueryAdapter';

export class TestQueryAdapter implements QueryAdapter.QueryAdapter {
  #options: QueryAdapter.Options = {};
  #filter: QueryAdapter.Filter = {};

  constructor(private modelName: string = 'none') {}

  getModelName(): string {
    return this.modelName;
  }
  getOptions(): QueryAdapter.Options {
    return this.#options;
  }
  getFilter(): QueryAdapter.Filter {
    return this.#filter;
  }
  setOptions(options: QueryAdapter.Options): void {
    Object.assign(this.#options, options);
  }
  setFilter(filter: QueryAdapter.Filter): void {
    this.#filter = filter;
  }
  toArray(): Promise<any[]> {
    return Promise.resolve([]);
  }
  stream(): Readable {
    throw new Error('Method not implemented.');
  }
}
