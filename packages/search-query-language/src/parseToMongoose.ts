import { assert, isNumber, isString, withCache } from '@andrew_l/toolkit';
import mongoose, { isObjectIdOrHexString } from 'mongoose';
import { Expression } from './Expression';
import {
  OpsResource,
  type ParseToMongoOptions,
  type ParseToMongoTransformFn,
  mergeOptions,
  reduceNode,
} from './parseToMongo';

/**
 * Utility transform functions
 * @group Constants
 */
export const MONGO_TRANSFORM = Object.freeze({
  /**
   * Ensures the value is not null.
   * Throws an error if the value is null.
   *
   * @throws {Error} If the value is null.
   */
  NOT_NULLABLE: ((value, key) => {
    assert.ok(value !== null, `The search key "${key}" cannot be null.`);
    return value;
  }) as ParseToMongoTransformFn,

  /**
   * Validates that the value is a number.
   * If the value is `null`, it returns `null` without throwing an error.
   *
   * @throws {Error} If the value is not a valid number.
   */
  NUMBER: ((value, key) => {
    if (value === null) return null;
    assert.number(value, `The search key "${key}" is not valid number.`);
    return value;
  }) as ParseToMongoTransformFn,

  /**
   * Validates that the value is a string.
   * If the value is `null`, it returns `null` without throwing an error.
   *
   * @throws {Error} If the value is not a valid string.
   */
  STRING: ((value, key) => {
    if (value === null) return null;
    assert.string(value, `The search key "${key}" is not valid string.`);
    return value;
  }) as ParseToMongoTransformFn,

  /**
   * Validates that the value is a boolean.
   * If the value is `null`, it returns `null` without throwing an error.
   *
   * @throws {Error} If the value is not a valid boolean.
   */
  BOOLEAN: ((value, key) => {
    if (value === null) return null;
    assert.boolean(value, `The search key "${key}" is not valid boolean.`);
    return value;
  }) as ParseToMongoTransformFn,

  /**
   * Validates and converts the value to a MongoDB ObjectId.
   * If the value is `null`, it returns `null` without throwing an error.
   *
   * @throws {Error} If the value is not a valid ObjectId.
   */
  OBJECT_ID: ((value, key) => {
    if (value === null) return null;
    assert.ok(
      isObjectIdOrHexString,
      `The search key "${key}" is not valid object id.`,
    );
    return new mongoose.Types.ObjectId(value as string);
  }) as ParseToMongoTransformFn,

  /**
   * Validates and converts the value to a Date.
   * Supports string and number inputs for conversion.
   * If the value is `null`, it returns `null` without throwing an error.
   *
   * @throws {Error} If the value is not a valid date.
   */
  DATE: ((value, key) => {
    if (value === null) return null;

    const result = isString(value)
      ? new Date(value)
      : isNumber(value)
        ? new Date(value)
        : undefined;

    assert.date(result, `The search key "${key}" is not valid date.`);

    return result;
  }) as ParseToMongoTransformFn,
} as const);

const INSTANCE_TO_TRANSFORM: Record<string, ParseToMongoTransformFn[]> = {
  Number: [MONGO_TRANSFORM.NUMBER],
  Decimal128: [MONGO_TRANSFORM.NUMBER],
  String: [MONGO_TRANSFORM.STRING],
  UUID: [MONGO_TRANSFORM.STRING],
  ObjectId: [MONGO_TRANSFORM.OBJECT_ID],
  Boolean: [MONGO_TRANSFORM.BOOLEAN],
  Date: [MONGO_TRANSFORM.DATE],
};

type MongooseSchema = mongoose.Schema;
type MongooseModel = mongoose.Model<any>;

/**
 * Parses a query string and converts it into a MongoDB-compatible query object,
 * using a provided Mongoose schema or model for field validation and transformation.
 *
 * @param {MongooseSchema | MongooseModel} reference - The Mongoose schema or model
 * used to infer field types and transformations.
 * @param {string} input - The query string to be parsed.
 * @param {ParseToMongoOptions} [options={}] - Optional configuration for parsing behavior.
 * @returns {Record<string, any>} - The MongoDB query representation.
 *
 * @example
 * // Type transformations are automatically inferred from the schema.
 * const schema = new mongoose.Schema({
 *   age: { type: Number },
 * });
 *
 * const query = parseToMongoose(schema, '_id = "67d737b73af3ff3e00a3bbf1"');
 * console.log(query);
 * // Output: { _id: new ObjectId("67d737b73af3ff3e00a3bbf1") }
 *
 * @example
 * // Complex queries with logical operators
 * const schema = new mongoose.Schema({
 *   age: { type: Number },
 *   customer: {
 *     name: { type: String },
 *     active: { type: Boolean },
 *   }
 * });
 *
 * const query = parseToMongoose(schema, 'customer.active = true AND age >= 18');
 * console.log(query);
 * // Output: { $and: [{ 'customer.active': true }, { age: { $gte: 18 } }] }
 *
 * @throws {Error} If the input query contains invalid syntax or references disallowed fields.
 *
 * @group Main
 */
export function parseToMongoose(
  reference: MongooseSchema | MongooseModel,
  input: string,
  options: ParseToMongoOptions = {},
): Record<string, any> {
  const opts = mergeOptions(
    extractFromSchema('schema' in reference ? reference.schema : reference),
    options,
  );

  const result: Record<string, any> = {};
  const ops = new OpsResource(opts.maxOps);
  const exp = new Expression(input).parse();

  for (const node of exp.body) {
    Object.assign(result, reduceNode(node, opts, ops));
  }

  return result;
}

const extractFromSchema = withCache(
  { objectStrategy: 'ref' },
  (schema: mongoose.Schema): ParseToMongoOptions => {
    const allowedKeys: string[] = [];
    const transform: Record<string, ParseToMongoTransformFn[]> = {};

    eachPath(schema, (path, type) => {
      transform[path] = INSTANCE_TO_TRANSFORM[type.instance];
      allowedKeys.push(path);
    });

    return { allowedKeys, transform };
  },
);

function eachPath(
  schema: mongoose.Schema,
  fn: (path: string, type: mongoose.SchemaType) => void,
  prefix: string = '',
) {
  schema.eachPath((path, type) => {
    if (type.schema) {
      eachPath(type.schema, fn, `${path}.`);
    } else {
      fn(`${prefix}${path}`, type);
    }
  });
}
