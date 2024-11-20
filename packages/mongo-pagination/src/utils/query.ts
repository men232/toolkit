import { deepClone, isNumber } from '@andrew_l/toolkit';
import { MongoInvalidArgumentError, type Sort } from 'mongodb';
import { debug } from '../debug';
import type { QueryAdapter } from '../QueryAdapter';
import type { Token } from '../Token';
import { isEmptyObject, isLastKeys, sameKeys } from './object';
import { type SortForCmd, formatSort } from './sort';

const DEF_LIMIT = 10;

/**
 * Creates a range filter based on sorting direction and values.
 *
 * This function generates a range filter to be used in queries, typically for pagination,
 * based on the provided sorting direction (ascending or descending) and the sorting values (field names and values).
 *
 * @param sortDirection - The sorting direction, which could be ascending or descending.
 * @param sortValues - The sorting values, including field names and their respective values for sorting.
 * @returns A range filter object that can be used in MongoDB.
 *
 * @example
 * // Example usage
 * const sortDirection = { age: 1 };
 * const sortValues = { age: 30 };
 * const rangeFilter = createRangeFilter(sortDirection, sortValues);
 * console.log(rangeFilter);
 * // Output: { age: { $gt: 30 } }
 *
 * @group Utils
 */
export function createRangeFilter(
  sortDirection: Sort,
  sortValues: Record<string, any>,
) {
  const sortCmd = formatSort(sortDirection) ?? ({} as SortForCmd);
  const keys: string[] = [];

  for (const [sortKey, sortValue] of sortCmd.entries()) {
    // skip unknown sort values
    if (sortValues[sortKey] === undefined) continue;

    // skip $meta sorting
    if (!isNumber(sortValue)) continue;

    keys.push(sortKey);
  }

  const op = (sortKey: string): string => {
    const direction = sortCmd.get(sortKey);
    return direction === 1 ? '$gt' : '$lt';
  };

  const val = (sortKey: string) => sortValues[sortKey];

  if (keys.length === 0) {
    return {};
  } else if (keys.length === 1) {
    const sortKey = keys[0];

    return {
      [sortKey]: {
        [op(sortKey)]: val(sortKey),
      },
    };
  }

  const $or = [];
  const keysAmount = keys.length;

  for (let i = 0; i < keysAmount; i++) {
    const sortKey = keys[i];

    if (i === 0) {
      $or.push({
        [sortKey]: { [op(sortKey)]: val(sortKey) },
      });
    } else {
      const filter: Record<string, any> = {};

      keys.slice(0, i).map(sortKey => {
        filter[sortKey] = { $eq: val(sortKey) };
      });

      const sortKey = keys[i];

      filter[sortKey] = {
        [op(sortKey)]: val(sortKey),
      };

      $or.push(filter);
    }
  }

  if ($or.length === 1) return $or[0];

  return { $or };
}

/**
 * Merges two MongoDB filters in the most effective way.
 *
 * This function combines two filters, prioritizing the most specific criteria
 * from both and ensuring the merged filter works efficiently for MongoDB queries.
 *
 * @param first - The first MongoDB filter object.
 * @param second - The second MongoDB filter object.
 * @returns The merged MongoDB filter object, combining both filters.
 *
 * @example
 * // Basic usage:
 * const filter1 = { status: 'active', age: { $gt: 18 } };
 * const filter2 = { age: { $lt: 60 }, country: 'USA' };
 *
 * const mergedFilter = mergeFilters(filter1, filter2);
 * console.log(mergedFilter);
 * // Output: { status: 'active', age: { $gt: 18, $lt: 60 }, country: 'USA' }
 *
 * @group Utils
 */
export function mergeFilters(
  first: Record<string, any>,
  second: Record<string, any>,
): Record<string, any> {
  switch (true) {
    // Just return second
    case isEmptyObject(first):
      return deepClone(second);

    // Just return first
    case isEmptyObject(second):
      return deepClone(first);

    // Just assign when no conflicts
    case sameKeys(first, second).length === 0:
      return Object.assign(deepClone(first), deepClone(second));

    // Merge with $and way
    case Array.isArray(first.$and):
      first = deepClone(first);
      second = deepClone(second);

      if (Object.keys(second).length === 1 && second.$and) {
        first.$and.push(...second.$and);
      } else {
        first.$and.push(second);
      }

      return first;

    // Regular merge via $and wrapping
    default:
      return {
        $and: [deepClone(first), deepClone(second)],
      };
  }
}

export interface TweakQueryOptions {
  query: QueryAdapter.QueryAdapter;
  paginationFields: string[];
  token?: Token;
}

export function tweakQuery({
  paginationFields,
  token,
  query,
}: TweakQueryOptions): string[] {
  let queryOptions = deepClone(query.getOptions());
  let queryFilter = deepClone(query.getFilter());

  paginationFields = deepClone(paginationFields);

  // transform original sort to plain object
  if (queryOptions.sort) {
    const sortMap = formatSort(queryOptions.sort);

    if (sortMap) {
      queryOptions.sort = Object.fromEntries(sortMap.entries());
    }
  }

  if (token) {
    // Replace sort way with previous options
    if (!isEmptyObject(token.sortDirection)) {
      debug.tweak(
        'set from token [queryOptions.sort] = %o',
        token.sortDirection,
      );

      queryOptions.sort = token.sortDirection;
    }

    // Extend original filter with range conditions
    if (!isEmptyObject(token.sortValues)) {
      const rangeFilter = createRangeFilter(
        queryOptions.sort as Sort,
        token.sortValues,
      );

      debug.tweak(
        'range conditions:\n\tsortDirection = %o\n\tsortValues = %o\n\tresult = %o',
        queryOptions.sort,
        token.sortValues,
        rangeFilter,
      );

      queryFilter = mergeFilters(queryFilter, rangeFilter);
    }
  }

  // Set default sort
  if (isEmptyObject(queryOptions.sort)) {
    queryOptions.sort = { _id: -1 };

    debug.tweak('set default [queryOptions.sort] = %o', queryOptions.sort);
  }

  // Set default pagination fields from query sort options
  if (!Array.isArray(paginationFields) || !paginationFields.length) {
    paginationFields = Object.keys(queryOptions.sort!);
    debug.tweak('set default [paginationFields] = %o', paginationFields);
  }

  // Pagination fields validation
  if (!isLastKeys(queryOptions.sort!, paginationFields)) {
    const expectedKeys = paginationFields.join(', ');

    throw new MongoInvalidArgumentError(
      `The query sort keys must ends with "${expectedKeys}".`,
    );
  }

  // Set default limit
  if (!queryOptions.limit) {
    queryOptions.limit = DEF_LIMIT + 1;
    debug.tweak('set default [queryOptions.limit] = %d', queryOptions.limit);
  } else {
    // Query one more element to see if there's another page
    queryOptions.limit = Math.max(queryOptions.limit || DEF_LIMIT, 1) + 1;
  }

  query.setOptions(queryOptions);
  query.setFilter(queryFilter);

  return paginationFields;
}
