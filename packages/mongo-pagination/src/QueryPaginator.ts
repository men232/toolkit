import Kareem from 'kareem';
import type internal from 'node:stream';

import { MongoInvalidArgumentError } from 'mongodb';
import { Token, createToken } from './Token';

import { debug } from './debug';
import { defineGetter, toObject } from './utils/object';
import { tweakQuery } from './utils/query';
import streamFilter from './utils/streamFilter';

import { crc32, pick, toError } from '@andrew_l/toolkit';
import type { QueryAdapter } from './QueryAdapter';
import { formatSort } from './utils/sort';

export interface QueryPaginatorOptions {
  /**
   * An optional list of fields used for building pagination query.
   */
  paginationFields?: string[];

  /**
   * The token to start the pagination from, if available.
   */
  next?: string | Buffer | null;

  /**
   * A callback function executed before the query is performed.
   */
  preQuery?: (this: QueryPaginator) => void;

  /**
   * A callback function executed after the query is performed.
   */
  postQuery?: (this: QueryPaginator) => void;

  /** @internal */
  debugQuery?: boolean;
}

export interface QueryPaginatorMeta {
  /**
   * Indicates whether there is a next page available.
   */
  hasNext: boolean;

  /**
   * The token for the next page, or `null` if there is no next page.
   */
  next: string | null;
}

export interface QueryPaginatorResult<T> {
  /**
   * The list of items for the current page.
   */
  items: T[];

  /**
   * Metadata providing information about pagination, such as whether more pages are available.
   */
  metadata: QueryPaginatorMeta;
}

/**
 * A generic class for handling query pagination.
 *
 * Look at `withMongoPagination` and `withMongoosePagination`
 *
 * @group Main
 */
export class QueryPaginator<T = any> {
  private hooks = new Kareem();
  private next: Token;
  private previous?: Token;
  private resHasNext = false;
  private resLastItem: any = null;
  private paginationFields: string[];
  private tweaked = false;
  private debugQuery = false;

  public getMetadata = () => this.metadata;

  constructor(
    private query: QueryAdapter.QueryAdapter,
    {
      paginationFields = [],
      postQuery,
      preQuery,
      next: previousToken,
      debugQuery = false,
    }: QueryPaginatorOptions = {},
  ) {
    this.paginationFields = paginationFields;
    this.debugQuery = debugQuery;

    this.next = createToken({
      modelName: query.getModelName(),
      sortDirection: {},
      sortValues: {},
      payload: {},
    });

    if (previousToken) {
      try {
        this.previous = Token.from(previousToken);
        this.paginationFields = Object.keys(this.previous.sortValues);

        debug.init('parse previous = %o', this.previous);
        debug.init(
          'set from previous [paginationFields] = %o',
          this.paginationFields,
        );
      } catch (orignErr) {
        const err = new MongoInvalidArgumentError(
          'Failed to parse next pagination cursor.',
          { cause: toError(orignErr) },
        );

        throw err;
      }

      // Compare the model name of next cursor
      const modelNameCRC = crc32(query.getModelName());

      debug.init(
        'compare model name: previous = %d, query = %d',
        this.previous.modelNameCRC,
        modelNameCRC,
      );

      if (modelNameCRC !== this.previous.modelNameCRC) {
        throw new MongoInvalidArgumentError(
          'The model name of next cursor token is not equal with query model name. Expected: ' +
            this.query.getModelName(),
        );
      }
    }

    if (preQuery) this.pre('query', preQuery);
    if (postQuery) this.post('query', postQuery);

    defineGetter(this.next, 'sortDirection', () => {
      const sortMap = formatSort(this.query.getOptions().sort);
      return sortMap ? Object.fromEntries(sortMap.entries()) : {};
    });

    defineGetter(this.next, 'sortValues', () => {
      if (!this.resLastItem) {
        return {};
      }

      return pick(this.resLastItem, this.paginationFields);
    });

    debug.init('with options = %o', arguments[1]);
  }

  /**
   * Retrieves metadata about the current state of pagination.
   */
  get metadata(): QueryPaginatorMeta {
    return {
      hasNext: this.hasNext,
      next: this.nextTokenString,
    };
  }

  /**
   * Indicates whether there is a next page available.
   */
  get hasNext(): boolean {
    return this.resHasNext;
  }

  /**
   * Retrieves the token for the next page.
   */
  get nextToken(): Token {
    return this.next;
  }

  /**
   * Retrieves the string representation of the next page token.
   * If there is no next page, returns `null`.
   */
  get nextTokenString(): string | null {
    if (!this.resHasNext) {
      return null;
    }

    return this.next.stringify();
  }

  /**
   * Retrieves the token for the previous page.
   */
  get prevToken(): Token | null {
    return this.previous || null;
  }

  /**
   * Retrieves the string representation of the previous page token.
   */
  get prevTokenString(): string | null {
    return this.previous ? this.previous.stringify() : null;
  }

  getQuery() {
    return this.query;
  }

  pre(hookName: string, fn: Function) {
    this.hooks.pre(hookName, fn);

    return this;
  }

  post(hookName: string, fn: Function) {
    this.hooks.post(hookName, fn);

    return this;
  }

  stream(): Promise<internal.Transform> {
    return new Promise((resolve, reject) => {
      this.hooks.execPre('query', this, [], (error: Error | null) => {
        if (error) return reject(error);

        try {
          this.maybeTweak();
        } catch (err) {
          return reject(err);
        }

        const limit = this.query.getOptions().limit;

        const filter = streamFilter<T>((item, index) => {
          // Remove the extra element that we added to 'peek' to see
          // if there were more entries.
          if (index + 1 === limit) {
            this.resHasNext = true;

            debug.stream(
              'has next:\n\tcutoff_idx = %d\n\tnext = %j',
              index,
              this.next,
            );

            return false;
          } else {
            this.resLastItem = toObject(item);
          }

          return true;
        });

        const stream = this.query.stream().pipe(filter);

        resolve(stream);
      });
    });
  }

  /** @internal */
  maybeTweak() {
    if (!this.tweaked) {
      this.tweak();
    }

    return this;
  }

  /** @internal */
  tweak() {
    this.paginationFields = tweakQuery({
      query: this.query,
      paginationFields: this.paginationFields,
      token: this.previous,
    });

    this.tweaked = true;

    return this;
  }

  /** @internal */
  _handleResult(items: any[]): QueryPaginatorResult<any> {
    const limit = this.query.getOptions().limit!;

    if (items.length === limit) {
      // Remove the extra element that we added to 'peek' to see
      // if there were more entries.
      items.pop();

      this.resHasNext = true;
    }

    this.resLastItem = toObject(items.at(-1));

    if (this.resHasNext) {
      debug.exec(
        'has next:\n\tcutoff_idx = %d\n\tnext = %j',
        limit - 1,
        this.next,
      );
    }

    const metadata = this.getMetadata();

    return { metadata, items };
  }

  /**
   * Executes the query and returns the results along with pagination metadata.
   */
  exec(): Promise<QueryPaginatorResult<T>> {
    return new Promise((resolve, reject) => {
      this.hooks.execPre('query', this, [], (preHookErr: any) => {
        if (preHookErr) {
          return reject(preHookErr);
        }

        if (this.debugQuery) {
          console.info('pre tweak', {
            queryFilter: this.query.getFilter(),
            getOptions: this.query.getOptions(),
            prevToken: this.prevToken,
          });
        }

        this.maybeTweak();

        if (this.debugQuery) {
          console.info('post tweak', {
            queryFilter: this.query.getFilter(),
            getOptions: this.query.getOptions(),
            prevToken: this.prevToken,
          });
        }

        this.query
          .toArray()
          .then(items => {
            const result = this._handleResult(items);

            this.hooks.execPost('query', this, [], (postHookErr: any) => {
              if (postHookErr) {
                return reject(postHookErr);
              }

              return resolve(result);
            });
          })
          .catch(reject);
      });
    });
  }

  then = ((onfulfilled, onrejected) =>
    this.exec().then(onfulfilled, onrejected)) as Promise<
    QueryPaginatorResult<T>
  >['then'];

  cath = (onrejected => this.exec().catch(onrejected)) as Promise<
    QueryPaginatorResult<T>
  >['catch'];

  finally = (onfinally => this.exec().finally(onfinally)) as Promise<
    QueryPaginatorResult<T>
  >['finally'];
}
