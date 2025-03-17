import {
  type Arrayable,
  arrayable,
  assert,
  isFunction,
  isNumber,
} from '@andrew_l/toolkit';
import { NODE } from './constants';
import { Expression } from './Expression';
import type { BinaryOperator, Node, NodeExpression } from './types';

const OPERATOR_MAP: Record<BinaryOperator, string> = {
  '=': '$eq',
  '!=': '$ne',
  '>': '$gt',
  '>=': '$gte',
  '<': '$lt',
  '<=': '$lte',
};

export type ParseToMongoTransformFn = (value: unknown, key: string) => unknown;

export interface ParseToMongoOptions {
  /**
   * Determines whether empty search queries are allowed.
   * If `true`, an empty query will return an unfiltered result.
   * If `false`, an empty query will be rejected.
   *
   * @default false
   */
  allowEmpty?: boolean;

  /**
   * A list of allowed keys that can be used in the search query.
   * If provided, any query using keys outside this list will be rejected.
   */
  allowedKeys?: string[];

  /**
   * Max of query ops combination.
   * @default Infinity
   */
  maxOps?: number;

  /**
   * A transformation function or a mapping of transformation functions
   * to modify query values before they are converted into a MongoDB query.
   *
   * - If an array is provided, all functions in the array will be applied.
   * - If a record object is provided, transformations will be applied
   *   based on the corresponding field key.
   *
   * @example
   * {
  'age': MONGO_TRANSFORM.NUMBER
  'customer._id': [MONGO_TRANSFORM.OBJECT_ID, MONGO_TRANSFORM.NOT_NULLABLE]
}
   */
  transform?:
    | Readonly<Arrayable<ParseToMongoTransformFn>>
    | Readonly<Record<string, Readonly<Arrayable<ParseToMongoTransformFn>>>>;
}

interface ParseToMongoOptionsInternal {
  allowEmpty: boolean;
  maxOps: number;
  allowedKeys?: Set<string>;
  transform: Record<string, ParseToMongoTransformFn[]>;
}

const NOOP_TRANSFORM: ParseToMongoTransformFn[] = [];

/**
 * Parses a query string and converts it into a MongoDB-compatible query object.
 *
 * @param {string} input - The query string to be parsed.
 * @returns {Record<string, any>} - The MongoDB query representation.
 *
 * @example
 * const query = parseToMongo('age > 30');
 * console.log(query);
 * // { age: { $gt: 30 } }
 *
 * @example
 * const query = parseToMongo('name = "Alice" AND age > 18');
 * console.log(query);
 * // { $and: [{ name: 'Alice' }, { age: { $gt: 18 } }] }
 *
 * @example
 * const query = parseToMongo('_id = "67d737b73af3ff3e00a3bbf1"', {
 *   transform: {
 *     _id: [MONGO_TRANSFORM.OBJECT_ID, MONGO_TRANSFORM.NOT_NULLABLE]
 *   }
 * });
 * console.log(query);
 * // { $and: [{ name: 'Alice' }, { age: { $gt: 18 } }] }
 *
 * @group Main
 */
export function parseToMongo(
  input: string,
  options: ParseToMongoOptions = {},
): Record<string, any> {
  const opts = mergeOptions(options);

  if (input.trim() === '') {
    assert.ok(opts.allowEmpty, 'Search query cannot be empty.');
    return {};
  }

  const result: Record<string, any> = {};
  const ops = new OpsResource(opts.maxOps);
  const exp = new Expression(input).parse();

  for (const node of exp.body) {
    Object.assign(result, reduceNode(node, opts, ops));
  }

  return result;
}

export function reduceNode(
  node: NodeExpression,
  options: ParseToMongoOptionsInternal,
  opsResource: OpsResource,
): Record<string, any> {
  switch (node.type) {
    case NODE.BINARY_EXPRESSION: {
      opsResource.assert();
      assert.ok(
        !options.allowedKeys || options.allowedKeys.has(node.left.name),
        `The search key "${node.left.name}" is not allowed.`,
      );

      const transform =
        options.transform?.[node.left.name] ||
        options.transform?.['*'] ||
        NOOP_TRANSFORM;

      return {
        [node.left.name]:
          node.operator === '='
            ? callTransform(transform, node.right.value, node.left.name)
            : {
                [OPERATOR_MAP[node.operator]]: callTransform(
                  transform,
                  node.right.value,
                  node.left.name,
                ),
              },
      };
    }

    case NODE.LOGICAL_EXPRESSION: {
      const op = node.operator === 'AND' ? '$and' : '$or';
      const right = reduceNode(node.right, options, opsResource);

      // combine same operator
      if (
        node.right.type === NODE.LOGICAL_EXPRESSION &&
        node.right.operator === node.operator
      ) {
        return {
          [op]: [reduceNode(node.left, options, opsResource), ...right[op]],
        };
      }

      return {
        [op]: [reduceNode(node.left, options, opsResource), right],
      };
    }

    default: {
      assert.ok(false, `Unexpected ast node: ${(node as Node).type}`);
    }
  }
}

export function mergeOptions(
  ...options: ParseToMongoOptions[]
): ParseToMongoOptionsInternal {
  const optsTransform: Record<string, ParseToMongoTransformFn[]> = {};

  const result: ParseToMongoOptionsInternal = {
    transform: optsTransform,
    allowEmpty: false,
    maxOps: Infinity,
  };

  for (const { transform, allowedKeys, ...rest } of options) {
    Object.assign(result, rest);

    if (allowedKeys?.length) {
      result.allowedKeys = new Set(allowedKeys);
    }

    if (Array.isArray(transform) || isFunction(transform)) {
      optsTransform['*'] = optsTransform['*'] || [];
      optsTransform['*'].push(...arrayable(transform));
    } else if (transform) {
      for (const [key, value] of Object.entries(transform)) {
        optsTransform[key] = optsTransform[key] || [];
        optsTransform[key].push(...arrayable(value));
      }
    }
  }

  return result;
}

export class OpsResource {
  uses: number;

  constructor(private max: number) {
    assert.ok(
      max === Infinity || (isNumber(max) && max > 0),
      'maxOps must be a number greater than zero.',
    );

    this.uses = 0;
  }

  assert() {
    assert.ok(
      ++this.uses <= this.max,
      `Maximum search operations reached: ${this.max}`,
    );
  }
}

function callTransform(
  fns: ParseToMongoTransformFn[],
  value: unknown,
  key: string,
): unknown {
  for (const fn of fns) {
    value = fn(value, key);
  }

  return value;
}
